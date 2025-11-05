// pages/Publish.tsx
import React, { useState } from 'react';
import styles from '../styles/Publish.module.css';
import ChannelSelector, { Channel } from '../components/ChannelSelector';
import ContentEditor from '../components/ContentEditor';
import DynamicPreview from '../components/DynamicPreview';
import AIAssistant from '../components/AIAssistant';

export default function Publish() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'blue' | 'green' | 'purple'>('light');
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(new Set());

  // ✅ Add this state to control AI toggle
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(false);

  const handlePublish = () => {
    if (selectedChannels.size === 0) {
      alert("Please select at least one channel.");
      return;
    }
    console.log("Publishing to:", Array.from(selectedChannels));
    console.log("Content:", content);
    console.log("Files:", files);
  };

  const handleSaveDraft = () => console.log("Saving draft...");
  const handleSchedule = () => console.log("Scheduling post...");

  const handleAIGenerated = (content: string) => {
    setContent(content);
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h1 className={styles.title}>Create and publish</h1>
      </div>

      <div className={styles.editorPreviewContainer}>
        {/* LEFT COLUMN: AI Assistant */}
        <div className={styles.aiAssistantPanel}>
          <AIAssistant onContentGenerated={handleAIGenerated} />
        </div>

        {/* MIDDLE COLUMN: Channel Selector + Content Editor */}
        <div className={styles.editorPanel}>
          <div className={styles.channelPanel}>
            <ChannelSelector
              selectedChannels={selectedChannels}
              onSelectionChange={setSelectedChannels}
            />
          </div>

          <div className={styles.contentEditorSection}>
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

          </div>
        </div>

        {/* RIGHT COLUMN: Dynamic Preview */}
        <div className={styles.previewPanel}>
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
