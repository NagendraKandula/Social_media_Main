import React, { useState, useEffect } from "react";
import styles from "../styles/Publish.module.css";
import ChannelSelector, { Channel } from "../components/ChannelSelector";
import ContentEditor from "../components/ContentEditor";
import { resolveEditorRules } from "../utils/resolveEditorRules";
import apiClient from "../lib/axios";

/* ================= TYPES ================= */

type Provider =
  | "facebook"
  | "instagram"
  | "youtube"
  | "threads"
  | "twitter"
  | "linkedin";

interface SocialAccount {
  name: string;
  profilePic?: string;
}

type ConnectedAccounts = Partial<Record<Provider, SocialAccount>>;

/* ================= COMPONENT ================= */

export default function Publish() {
  /* MULTI-PUBLISH STATE */
  const [selectedChannels, setSelectedChannels] =
    useState<Set<Channel>>(new Set());

  const [connectedAccounts, setConnectedAccounts] =
    useState<ConnectedAccounts>({});

  /* EDITOR STATE (shared) */
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  /* Convert Set → Array for rendering */
  const selectedChannelList = Array.from(selectedChannels);

  const selectedPlatforms = selectedChannelList as any;

  
  const effectiveRules = resolveEditorRules(selectedPlatforms);

  /* ================= FETCH CONNECTED ACCOUNTS ================= */
  useEffect(() => {
    const fetchConnectedAccounts = async () => {
      try {
        const res = await apiClient.get(
          "/auth/social/active-accounts"
        );
        setConnectedAccounts(res.data || {});
      } catch (err) {
        console.error(
          "Failed to fetch connected accounts:",
          err
        );
      }
    };

    fetchConnectedAccounts();
  }, []);

  /* ================= RENDER ================= */

  return (
    <div className={styles.publishPage}>
      {/* LEFT SIDEBAR */}
      <aside className={styles.leftPanel}>
        <ChannelSelector
          selectedChannels={selectedChannels}
          onSelectionChange={setSelectedChannels}
          connectedAccounts={connectedAccounts}
        />
      </aside>

      {/* CENTER PANEL */}
      <main className={styles.centerPanel}>
        {/* Header */}
        <div className={styles.header}>
          <h2>Create post</h2>

          <div className={styles.headerActions}>
            <button>Schedule</button>
            <button>Tags</button>
            <button disabled>Publish</button>
          </div>
        </div>

        {/* MULTI-PUBLISH CONTEXT */}
        {selectedChannelList.length > 0 && (
          <div className={styles.publishContext}>
            <div className={styles.contextTitle}>
              Posting to {selectedChannelList.length} channel
              {selectedChannelList.length > 1 ? "s" : ""}
            </div>

            <div className={styles.contextChannels}>
              {selectedChannelList.join(" · ")}
            </div>
          </div>
        )}

        {/* CONTENT EDITOR (STEP 4) */}
       <ContentEditor
  content={content}
  onContentChange={setContent}
  files={files}
  onFilesChange={setFiles}
  aiAssistantEnabled={false}
  setAiAssistantEnabled={() => {}}
  effectiveRules={effectiveRules}
  validation={{}}
/>


      </main>

      {/* RIGHT PREVIEW */}
      <aside className={styles.rightPanel}>
        <div className={styles.placeholder}>
          Preview will go here
        </div>
      </aside>
    </div>
  );
}
