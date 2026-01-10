import React from "react";
import styles from "../styles/PlatformFields.module.css";
import { Channel } from "./ChannelSelector";

// Shared types
export interface PlatformState {
  // Facebook
  facebookPageId?: string;
  facebookPostType?: "feed" | "reel" | "story";
  // Instagram
  instagramPostType?: "post" | "reel" | "story";
  // YouTube
  youtubeTitle?: string;
  youtubeVisibility?: "public" | "unlisted" | "private";
  youtubeType?: "video" | "shorts";
  // LinkedIn, Threads usually auto-detect based on file, but we can store extras if needed
}

interface Props {
  selectedChannels: Set<Channel>; // Changed to Set to match your Publish page
  platformState: PlatformState;
  setPlatformState: React.Dispatch<React.SetStateAction<PlatformState>>;
  facebookPages: { id: string; name: string }[]; // Pass pages here
}

export default function PlatformFields({
  selectedChannels,
  platformState,
  setPlatformState,
  facebookPages,
}: Props) {

  const update = (key: keyof PlatformState, value: any) => {
    setPlatformState((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className={styles.container}>
      {/* 📘 FACEBOOK */}
      {selectedChannels.has("facebook") && (
        <div className={styles.platformCard}>
          <div className={styles.cardHeader}>
            <img src="/facebook.png" alt="FB" width={20} />
            <span>Facebook Settings</span>
          </div>
          
          <div className={styles.row}>
            <label>Page</label>
            <select
              value={platformState.facebookPageId || ""}
              onChange={(e) => update("facebookPageId", e.target.value)}
            >
              <option value="">Select Page...</option>
              {facebookPages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.row}>
            <label>Post As</label>
            <div className={styles.toggleGroup}>
              {["feed", "reel", "story"].map((type) => (
                <button
                  key={type}
                  className={platformState.facebookPostType === type ? styles.active : ""}
                  onClick={() => update("facebookPostType", type as any)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 📷 INSTAGRAM */}
      {(selectedChannels.has("instagram") ) && (
        <div className={styles.platformCard}>
          <div className={styles.cardHeader}>
            <img src="/instagram.png" alt="IG" width={20} />
            <span>Instagram Settings</span>
          </div>
          <div className={styles.row}>
            <label>Post As</label>
            <div className={styles.toggleGroup}>
              {["post", "reel", "story"].map((type) => (
                <button
                  key={type}
                  className={platformState.instagramPostType === type ? styles.active : ""}
                  onClick={() => update("instagramPostType", type as any)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ▶️ YOUTUBE */}
      {selectedChannels.has("youtube") && (
        <div className={styles.platformCard}>
          <div className={styles.cardHeader}>
            <img src="/youtube.png" alt="YT" width={20} />
            <span>YouTube Settings</span>
          </div>
          
          <div className={styles.row}>
             <label>Title <span style={{color:'red'}}>*</span></label>
             <input 
               type="text" 
               placeholder="Video Title"
               value={platformState.youtubeTitle || ""}
               onChange={(e) => update("youtubeTitle", e.target.value)}
             />
          </div>

          <div className={styles.row}>
            <label>Format</label>
            <div className={styles.toggleGroup}>
              <button
                className={platformState.youtubeType === "video" ? styles.active : ""}
                onClick={() => update("youtubeType", "video")}
              >Video</button>
              <button
                className={platformState.youtubeType === "shorts" ? styles.active : ""}
                onClick={() => update("youtubeType", "shorts")}
              >Shorts</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}