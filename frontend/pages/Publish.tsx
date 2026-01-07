// pages/Publish.tsx
import React, { useState, useEffect } from "react";
import styles from "../styles/Publish.module.css";
import ChannelSelector, { Channel } from "../components/ChannelSelector";
import ContentEditor from "../components/ContentEditor";
import DynamicPreview from "../components/DynamicPreview";
import AIAssistant from "../components/AIAssistant";
import apiClient from "../lib/axios";

/* =========================
   TYPES
   ========================= */

type Provider =
  | "facebook"
  | "instagram"
  | "youtube"
  | "threads"
  | "twitter"
  | "linkedin";

type ConnectedAccounts = Partial<Record<Provider, boolean>>;

export default function Publish() {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedChannels, setSelectedChannels] =
    useState<Set<Channel>>(new Set());
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  /* ✅ NEW: connected accounts */
  const [connectedAccounts, setConnectedAccounts] =
    useState<ConnectedAccounts>({});

  /* ================= FETCH CONNECTED ACCOUNTS ================= */
  useEffect(() => {
    const fetchConnectedAccounts = async () => {
      try {
        const res = await apiClient.get("/auth/social/active-accounts");
        const connected: ConnectedAccounts = {};

        Object.entries(res.data || {}).forEach(([key, value]) => {
          if (value) connected[key as Provider] = true;
        });

        setConnectedAccounts(connected);
      } catch (err) {
        console.error("Failed to fetch connected accounts:", err);
      }
    };

    fetchConnectedAccounts();
  }, []);

  /* ================= PUBLISH ================= */
  const handlePublish = async () => {
    if (selectedChannels.size === 0) {
      alert("Please select at least one channel.");
      return;
    }

    setIsPublishing(true);
    const results: string[] = [];
    const errors: string[] = [];

    try {
      const channels = Array.from(selectedChannels);

      await Promise.all(
        channels.map(async (channel) => {
          if (channel === "threads") {
            try {
              const formData = new FormData();
              formData.append("content", content);

              if (files.length > 0) {
                formData.append("file", files[0]);
              }

              const response = await apiClient.post(
                "/threads/post",
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
              );

              results.push(`Threads: Success (ID: ${response.data.postId})`);
            } catch (error: any) {
              const errMsg =
                error.response?.data?.message || "Unknown error";
              errors.push(`Threads: Failed (${errMsg})`);
            }
          } else {
            console.log(
              `Skipping implementation for ${channel} (not yet implemented)`
            );
          }
        })
      );

      if (errors.length > 0) {
        alert(
          `Publishing completed with errors:\n${errors.join(
            "\n"
          )}\n${results.join("\n")}`
        );
      } else {
        alert(`Successfully published to:\n${results.join("\n")}`);
        setContent("");
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
          {/* ✅ UPDATED: pass connectedAccounts */}
          <ChannelSelector
            selectedChannels={selectedChannels}
            onSelectionChange={setSelectedChannels}
            connectedAccounts={connectedAccounts}
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

          {isPublishing && (
            <p style={{ color: "#0070f3", marginTop: "10px" }}>
              Publishing in progress...
            </p>
          )}
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
