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

type InstagramMediaType = "IMAGE" | "REEL" | "STORIES";
type ConnectedAccounts = Partial<Record<Provider, SocialAccount>>;

/* ================= COMPONENT ================= */

export default function Publish() {
  const [mediaUrl, setMediaUrl] = useState("");

  /* MULTI-PUBLISH STATE */
  const [selectedChannels, setSelectedChannels] =
    useState<Set<Channel>>(new Set());

  const [connectedAccounts, setConnectedAccounts] =
    useState<ConnectedAccounts>({});

  /* INSTAGRAM STATE */
  const [instagramMediaType, setInstagramMediaType] =
    useState<InstagramMediaType>("IMAGE");

  /* EDITOR STATE (shared) */
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  /* Convert Set → Array */
  const selectedChannelList = Array.from(selectedChannels);

  /* Platform helpers */
  const isInstagramSelected =
    selectedChannelList.includes("instagram");

  /* Resolve rules */
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

        {/* INSTAGRAM MEDIA TYPE */}
        {isInstagramSelected && (
          <div className={styles.platformSection}>
            <div className={styles.sectionHeader}>
              Instagram post type
            </div>

            <div className={styles.tabs}>
              <button
                type="button"
                className={
                  instagramMediaType === "IMAGE"
                    ? styles.activeTab
                    : ""
                }
                onClick={() =>
                  setInstagramMediaType("IMAGE")
                }
              >
                Feed
              </button>

              <button
                type="button"
                className={
                  instagramMediaType === "REEL"
                    ? styles.activeTab
                    : ""
                }
                onClick={() =>
                  setInstagramMediaType("REEL")
                }
              >
                Reel
              </button>

              <button
                type="button"
                className={
                  instagramMediaType === "STORIES"
                    ? styles.activeTab
                    : ""
                }
                onClick={() =>
                  setInstagramMediaType("STORIES")
                }
              >
                Story
              </button>
            </div>
          </div>
        )}

        {/* CONTENT EDITOR */}
        <ContentEditor
  content={content}
  onContentChange={setContent}
  files={files}
  onFilesChange={setFiles}
  mediaUrl={mediaUrl}
  onMediaUrlChange={setMediaUrl}
  aiAssistantEnabled={false}
  setAiAssistantEnabled={() => {}}
  effectiveRules={effectiveRules}
  validation={{}}
  platformContext={{
    instagram: { mediaType: instagramMediaType },
  }}
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
