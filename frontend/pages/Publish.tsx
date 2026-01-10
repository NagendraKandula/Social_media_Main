import React, { useState, useEffect } from 'react';
import styles from '../styles/Publish.module.css';
import ChannelSelector, { Channel } from '../components/ChannelSelector';
import ContentEditor from '../components/ContentEditor';
import AIAssistant from '../components/AIAssistant';
import { usePostCreation } from '../hooks/usePostCreation';
import apiClient from '../lib/axios'; // ✅ Import API Client for fetching pages

// ✅ 1. Define Expanded Post Types to match Backend Logic
type PostType = 'POST' | 'REEL' | 'STORY';

interface FacebookPage {
  id: string;
  name: string;
  pictureUrl?: string;
}

export default function Publish() {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(new Set());
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(false);
  
  // ✅ 2. New State for Post Type & Facebook Page
  const [postType, setPostType] = useState<PostType>('POST');
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");

  const { uploadMedia, createPost, uploading, publishing } = usePostCreation();

  // ✅ 3. Fetch Facebook Pages when 'facebook' is selected
  useEffect(() => {
    if (selectedChannels.has('facebook')) {
      fetchFacebookPages();
    }
  }, [selectedChannels]);

  const fetchFacebookPages = async () => {
    try {
      const { data } = await apiClient.get('/facebook/pages');
      setFacebookPages(data);
      if (data.length > 0 && !selectedPageId) {
        setSelectedPageId(data[0].id); // Default to first page
      }
    } catch (error) {
      console.error("Failed to fetch Facebook pages", error);
    }
  };

  const handlePublish = async () => {
    if (selectedChannels.size === 0) {
      alert("Please select at least one channel.");
      return;
    }
    if (!content && files.length === 0) {
      alert("Please add content or a media file.");
      return;
    }

    // 🛡️ Validation: Facebook requires a Page ID
    if (selectedChannels.has('facebook') && !selectedPageId) {
      alert("Please select a Facebook Page.");
      return;
    }

    // 🛡️ Validation: Reels require Video
    if (postType === 'REEL' && files.length > 0 && !files[0].type.startsWith('video')) {
      alert("Reels/Shorts require a video file.");
      return;
    }

    try {
      let mediaData = { publicUrl: "", storagePath: "" };

      // 1. Upload Media (Direct-to-Cloud)
      if (files.length > 0) {
        mediaData = await uploadMedia(files[0]);
      }

      // ✅ 4. Determine the correct backend MediaType
      // Backend expects: 'IMAGE' | 'VIDEO' | 'REEL' | 'STORY'
      let finalMediaType = 'IMAGE'; 

      if (files.length > 0) {
        const isVideo = files[0].type.startsWith('video');

        if (postType === 'STORY') {
          finalMediaType = 'STORY';
        } else if (postType === 'REEL') {
          finalMediaType = 'REEL'; // Implies Video
        } else {
          // 'POST' (Feed)
          finalMediaType = isVideo ? 'VIDEO' : 'IMAGE';
        }
      }

      // 5. Construct Payload
      const payload = {
        content: content,
        mediaUrl: mediaData.publicUrl || "",      
        storagePath: mediaData.storagePath || "", 
        mimeType: files[0]?.type || "",
        
        // ✅ Send the determined type
        mediaType: finalMediaType, 

        platforms: Array.from(selectedChannels),
        scheduledAt: null, 
        
        // ✅ 6. Send Metadata with Facebook Page ID
        contentMetadata: {
          title: content.substring(0, 50), // YouTube requires a title
          text: content,
          platformOverrides: {
            facebook: {
              pageId: selectedPageId // Required by Backend Logic
            }
          }
        }
      };

      await createPost(payload);
      alert("Post Published Successfully! 🚀");
      
      setContent('');
      setFiles([]);
      setSelectedChannels(new Set());

    } catch (err: any) {
      console.error("Publish Error:", err);
      alert(`Error: ${err.message || "Failed to publish"}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h1 className={styles.title}>Create and publish</h1>
      </div>

      <div className={styles.editorPreviewContainer}>
        {aiAssistantEnabled && <AIAssistant />}

        <div className={styles.leftPanel}>
          
          {/* ✅ 7. Enhanced Post Type Selector */}
          <div className={styles.formatSelector}>
            <h3>Post Format</h3>
            <div className={styles.toggleContainer}>
              <button 
                className={`${styles.toggleBtn} ${postType === 'POST' ? styles.active : ''}`}
                onClick={() => setPostType('POST')}
              >
                📝 Feed Post
              </button>
              <button 
                className={`${styles.toggleBtn} ${postType === 'REEL' ? styles.active : ''}`}
                onClick={() => setPostType('REEL')}
              >
                🎬 Reel / Short
              </button>
              <button 
                className={`${styles.toggleBtn} ${postType === 'STORY' ? styles.active : ''}`}
                onClick={() => setPostType('STORY')}
              >
                📖 Story
              </button>
            </div>
          </div>

          <ChannelSelector
            selectedChannels={selectedChannels}
            onSelectionChange={setSelectedChannels}
          />

          {/* ✅ 8. Facebook Page Selector (Only visible if Facebook is selected) */}
          {selectedChannels.has('facebook') && (
            <div className={styles.pageSelector}>
              <label>Select Facebook Page:</label>
              <select 
                value={selectedPageId} 
                onChange={(e) => setSelectedPageId(e.target.value)}
                className={styles.dropdown}
              >
                {facebookPages.length === 0 && <option value="">Loading pages...</option>}
                {facebookPages.map(page => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <ContentEditor
            content={content}
            onContentChange={setContent}
            files={files}
            onFilesChange={setFiles}
            onPublish={handlePublish}
            onSaveDraft={() => {}}
            onSchedule={() => {}}
            aiAssistantEnabled={aiAssistantEnabled}
            setAiAssistantEnabled={setAiAssistantEnabled}
          />

          {uploading && <p style={{ color: '#0070f3' }}>☁️ Uploading media...</p>}
          {publishing && <p style={{ color: '#0070f3' }}>🚀 Publishing post...</p>}
        </div>

        <div className={styles.previewWrapper}>
         {/* Previews can be added here */}
        </div>
      </div>
    </div>
  );
}