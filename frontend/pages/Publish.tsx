
// pages/Publish.tsx
import React, { useState } from 'react';
import styles from '../styles/Publish.module.css';
import ChannelSelector, { Channel } from '../components/ChannelSelector';
import ContentEditor from '../components/ContentEditor';
import DynamicPreview from '../components/DynamicPreview';
import AIAssistant from '../components/AIAssistant';
import apiClient from '../lib/axios'; // ✅ Import API Client

export default function Publish() {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(new Set());
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false); // ✅ Loading state

  // ✅ Action handlers
  const handlePublish = async () => {
    if (selectedChannels.size === 0) {
      alert("Please select at least one channel.");
      return;
    }

    setIsPublishing(true);
    const results: string[] = [];
    const errors: string[] = [];

    try {
      // Convert Set to Array to iterate
      const channels = Array.from(selectedChannels);

      // ✅ Use Promise.all to publish to multiple channels in parallel (or sequential if preferred)
      await Promise.all(channels.map(async (channel) => {
        if (channel === 'threads') {
          try {
            console.log(`🚀 Publishing to Threads...`);
            
            // ✅ Construct FormData for file upload
            const formData = new FormData();
            formData.append('content', content);
            
            // Append first file if exists (Threads typically handles one media item per post via this API)
            if (files.length > 0) {
              formData.append('file', files[0]);
            }

            const response = await apiClient.post('/threads/post', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });

            console.log(`✅ Threads success:`, response.data);
            results.push(`Threads: Success (ID: ${response.data.postId})`);
          } catch (error: any) {
            console.error(`❌ Threads failed:`, error);
            const errMsg = error.response?.data?.message || 'Unknown error';
            errors.push(`Threads: Failed (${errMsg})`);
          }
        } else {
          // Placeholder for other channels
          console.log(`Skipping implementation for ${channel} (not yet connected in Publish.tsx)`);
        }
      }));

      // ✅ Feedback to user
      if (errors.length > 0) {
        alert(`Publishing completed with errors:\n${errors.join('\n')}\n${results.join('\n')}`);
      } else {
        alert(`Successfully published to:\n${results.join('\n')}`);
        // Optional: Clear form
        setContent('');
        setFiles([]);
      }

    } catch (err) {
      console.error("Global publish error:", err);
      alert("An unexpected error occurred during publishing.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = () => {
    console.log("Saving draft...");
  };

  const handleSchedule = () => {
    console.log("Scheduling post...");
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h1 className={styles.title}>Create and publish</h1>
      </div>

      <div className={styles.editorPreviewContainer}>
        {aiAssistantEnabled && <AIAssistant />}

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
            onPublish={handlePublish}
            onSaveDraft={handleSaveDraft}
            onSchedule={handleSchedule}
            aiAssistantEnabled={aiAssistantEnabled}
            setAiAssistantEnabled={setAiAssistantEnabled}
          />
          {/* ✅ Show loading indicator */}
          {isPublishing && <p style={{ color: '#0070f3', marginTop: '10px' }}>Publishing in progress...</p>}
        </div>

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
