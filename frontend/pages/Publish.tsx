import React, { useState } from 'react';
import styles from '../styles/Publish.module.css';
import ChannelSelector, { Channel } from '../components/ChannelSelector';
import ContentEditor from '../components/ContentEditor';
import DynamicPreview from '../components/DynamicPreview';
import AIAssistant from '../components/AIAssistant';
import { usePostCreation } from '../hooks/usePostCreation';

// ✅ 1. Define the formats
type PostFormat = 'VIDEO' | 'REEL'; 

export default function Publish() {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(new Set());
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(false);
  
  // ✅ 2. New State for Youtube Format
  const [postFormat, setPostFormat] = useState<PostFormat>('VIDEO');

  const { uploadMedia, createPost, uploading, publishing } = usePostCreation();

  const handlePublish = async () => {
    if (selectedChannels.size === 0) {
      alert("Please select at least one channel.");
      return;
    }
    if (!content && files.length === 0) {
      alert("Please add content or a media file.");
      return;
    }

    // 🛡️ Validation: YouTube Shorts must be < 60s (You can add check here if you want)
    // if (postFormat === 'REEL' && files[0].size > 50 * 1024 * 1024) { ... }

    try {
      let mediaData = { publicUrl: "", storagePath: "" };

      // 1. Upload Media (Direct-to-Cloud)
      if (files.length > 0) {
        mediaData = await uploadMedia(files[0]);
      }

      // ✅ 3. Determine the correct backend type
      // If user selected "YouTube Short" -> Send 'REEL'
      // If user selected "Regular Video" -> Send 'VIDEO'
      let finalMediaType = 'IMAGE';
      if (files.length > 0) {
        const fileType = files[0].type;
        if (fileType.startsWith('video')) {
            finalMediaType = postFormat === 'REEL' ? 'REEL' : 'VIDEO';
        }
      }

      // 4. Construct Payload
      const payload = {
        content: content,
        mediaUrl: mediaData.publicUrl || "",      
        storagePath: mediaData.storagePath || "", 
        mimeType: files[0]?.type || "",
        
        // ✅ Send the determined type
        mediaType: finalMediaType, 

        platforms: Array.from(selectedChannels),
        scheduledAt: null, 
        contentMetadata: {
          title: content.substring(0, 50), // YouTube requires a title
          text: content,
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
          
          {/* ✅ 4. THE NEW TOGGLE UI */}
          <div className={styles.formatSelector}>
            <h3>Post Type</h3>
            <div className={styles.toggleContainer}>
              <button 
                className={`${styles.toggleBtn} ${postFormat === 'VIDEO' ? styles.active : ''}`}
                onClick={() => setPostFormat('VIDEO')}
              >
                📺 Regular Video
              </button>
              <button 
                className={`${styles.toggleBtn} ${postFormat === 'REEL' ? styles.active : ''}`}
                onClick={() => setPostFormat('REEL')}
              >
                📱 YouTube Short / Reel
              </button>
            </div>
          </div>

          <ChannelSelector
            selectedChannels={selectedChannels}
            onSelectionChange={setSelectedChannels}
          />
          
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

          {uploading && <p style={{ color: '#0070f3' }}>☁️ Uploading...</p>}
          {publishing && <p style={{ color: '#0070f3' }}>🚀 Publishing...</p>}
        </div>

        <div className={styles.previewWrapper}>
         
        </div>
      </div>
    </div>
  );
}