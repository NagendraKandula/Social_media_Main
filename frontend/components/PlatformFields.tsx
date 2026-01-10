// frontend/components/PlatformFields.tsx
import React from "react";
import styles from "../styles/PlatformFields.module.css";
import { Channel } from "./ChannelSelector";

export interface PlatformState {
  facebookPageId?: string;
  facebookPostType?: "feed" | "reel" | "story";
  instagramPostType?: "post" | "reel" | "story";
  youtubeTitle?: string;
  youtubeVisibility?: "public" | "unlisted" | "private";
  youtubeType?: "video" | "shorts";
}

interface Props {
  selectedChannels: Set<Channel>;
  platformState: PlatformState;
  setPlatformState: React.Dispatch<React.SetStateAction<PlatformState>>;
  facebookPages: { id: string; name: string }[];
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
          <h4>Facebook Settings</h4>
          <div style={{ marginBottom: 10 }}>
            <label>Select Page:</label>
            <select
              value={platformState.facebookPageId || ""}
              onChange={(e) => update("facebookPageId", e.target.value)}
              style={{ width: '100%', padding: 8, marginTop: 5 }}
            >
              <option value="">-- Choose Page --</option>
              {facebookPages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Post Type: </label>
            <select
              value={platformState.facebookPostType || "feed"}
              onChange={(e) => update("facebookPostType", e.target.value)}
              style={{ padding: 5, marginLeft: 10 }}
            >
              <option value="feed">Feed (Regular)</option>
              <option value="reel">Reel (Short Video)</option>
              <option value="story">Story (24h)</option>
            </select>
          </div>
        </div>
      )}

      {/* ▶️ YOUTUBE */}
      {selectedChannels.has("youtube") && (
        <div className={styles.platformCard}>
          <h4>YouTube Settings</h4>
          <div style={{ marginBottom: 10 }}>
             <label>Video Title <span style={{color:'red'}}>*</span></label>
             <input 
               type="text" 
               placeholder="Enter video title..."
               value={platformState.youtubeTitle || ""}
               onChange={(e) => update("youtubeTitle", e.target.value)}
               style={{ width: '100%', padding: 8, marginTop: 5 }}
             />
          </div>
          <div>
            <label>Format: </label>
            <select
              value={platformState.youtubeType || "video"}
              onChange={(e) => update("youtubeType", e.target.value)}
              style={{ padding: 5, marginLeft: 10 }}
            >
              <option value="video">Regular Video</option>
              <option value="shorts">YouTube Short</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}