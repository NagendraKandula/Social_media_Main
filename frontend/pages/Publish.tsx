// pages/Publish.tsx
import React, { useState } from 'react';
import styles from '../styles/Publish.module.css';
import ChannelSelector, { Channel } from '../components/ChannelSelector'; // ✅ Import Channel type
import ContentEditor from '../components/ContentEditor';
import DynamicPreview from '../components/DynamicPreview';
import AIAssistant from '../components/AIAssistant'; // Import the AI Assistant component

export default function Publish() {
  // ✅ State for content and files
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // ✅ State for selected channels — MUST be a Set<Channel>
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(new Set());
  
  // State to control the visibility of the AI Assistant
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(false);

  // ✅ Action handlers
  const handlePublish = () => {
    if (selectedChannels.size === 0) {
      alert("Please select at least one channel.");
      return;
    }
    console.log("Publishing to:", Array.from(selectedChannels));
    console.log("Content:", content);
    console.log("Files:", files);
    // TODO: Call API
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
        {/* Conditionally render the AI Assistant on the left */}
        {aiAssistantEnabled && <AIAssistant />}

        {/* Left panel: ChannelSelector + ContentEditor */}
        <div className={styles.leftPanel}>
          {/* ✅ Pass selectedChannels and onSelectionChange */}
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
            // Pass state and setter for the AI Assistant toggle
            aiAssistantEnabled={aiAssistantEnabled}
            setAiAssistantEnabled={setAiAssistantEnabled}
          />
        </div>

        <div className={styles.previewWrapper}>
          {/* ✅ Pass REAL selected platforms (as strings) */}
          <DynamicPreview
            selectedPlatforms={Array.from(selectedChannels)} // ✅ Dynamic!
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