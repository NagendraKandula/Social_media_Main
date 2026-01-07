import React, { useState } from 'react';
import styles from '../styles/Publish.module.css';
import ChannelSelector, { Channel } from '../components/ChannelSelector';
import ContentEditor from '../components/ContentEditor';
import DynamicPreview from '../components/DynamicPreview';
import AIAssistant from '../components/AIAssistant';
// ✅ Import the new hook (Make sure you created this file in frontend/hooks/)
import { usePostCreation } from '../hooks/usePostCreation';

export default function Publish() {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  // Use Set for selection, but convert to Array for API
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(new Set());
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(false);

  // ✅ Use the Hook for all backend interactions
  const { uploadMedia, createPost, uploading, publishing } = usePostCreation();

  // ✅ THE NEW PUBLISH LOGIC
  const handlePublish = async () => {
    // 1. Validation
    if (selectedChannels.size === 0) {
      alert("Please select at least one channel.");
      return;
    }
    if (!content && files.length === 0) {
      alert("Please add content or a media file.");
      return;
    }

    try {
      let mediaData = { publicUrl: "", storagePath: "" };

      // 2. Upload Media (Direct-to-Cloud)
      if (files.length > 0) {
        // We handle the first file for now. 
        // If you support multi-image/carousel later, you'd map over files here.
        const fileToUpload = files[0];
        mediaData = await uploadMedia(fileToUpload);
      }

      // 3. Construct Payload (Matches Backend DTO)
      const payload = {
        content: content,
        
        // Media Info (from Google Cloud)
        mediaUrl: mediaData.publicUrl || "",      
        storagePath: mediaData.storagePath || "", 
        mimeType: files[0]?.type || "",
        mediaType: files[0]?.type.startsWith('video') ? 'VIDEO' : 'IMAGE',

        // Platforms (Convert Set -> Array)
        platforms: Array.from(selectedChannels),
        
        // Scheduling (null = Post Now)
        scheduledAt: null, 
        
        // Rich Metadata (Future-proofing)
        contentMetadata: {
          text: content,
          platformOverrides: {
             // Example: You could add specific text for LinkedIn here if your UI supported it
          }
        }
      };

      // 4. Send to Backend (Single API call)
      await createPost(payload);
      
      alert("Post Published Successfully! 🚀");
      
      // 5. Reset Form
      setContent('');
      setFiles([]);
      setSelectedChannels(new Set());

    } catch (err: any) {
      console.error("Publish Error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to publish.";
      alert(`Error: ${msg}`);
    }
  };

  const handleSaveDraft = () => {
    // Placeholder for draft logic
    alert("Draft saved locally! (Backend implementation pending)");
  };

  const handleSchedule = () => {
    // Placeholder - would open a date picker and pass date to createPost
    alert("Scheduler UI coming soon! Backend is ready for it.");
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h1 className={styles.title}>Create and publish</h1>
      </div>

      <div className={styles.editorPreviewContainer}>
        {/* AI Assistant Toggle */}
        {aiAssistantEnabled && <AIAssistant />}

        {/* LEFT PANEL: Editor */}
        <div className={styles.leftPanel}>
          <ChannelSelector
            selectedChannels={selectedChannels}
            onSelectionChange={setSelectedChannels}
          />
          
          <ContentEditor
            content={content}
            onContentChange={setContent}
            files={files}
            onFilesChange={setFiles}
            
            // Connect actions
            onPublish={handlePublish}
            onSaveDraft={handleSaveDraft}
            onSchedule={handleSchedule}
            
            // AI Props
            aiAssistantEnabled={aiAssistantEnabled}
            setAiAssistantEnabled={setAiAssistantEnabled}
          />

          {/* Status Indicators */}
          {uploading && (
            <div className={styles.statusMessage} style={{ color: '#0070f3' }}>
              ☁️ Uploading media to cloud...
            </div>
          )}
          {publishing && (
            <div className={styles.statusMessage} style={{ color: '#0070f3' }}>
              🚀 Sending to platforms...
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Preview */}
        <div className={styles.previewWrapper}>
          <DynamicPreview
            selectedPlatforms={Array.from(selectedChannels)}
            content={content}
            mediaFiles={files}
            onPublish={handlePublish}
            onSaveDraft={handleSaveDraft}
            onSchedule={handleSchedule}
          />
        </div>
      </div>
    </div>
  );
}