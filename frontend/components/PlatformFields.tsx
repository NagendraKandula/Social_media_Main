// frontend/components/PlatformFields.tsx
import React from "react";
import styles from "../styles/PlatformFields.module.css";
import { Channel } from "./ChannelSelector";

export interface PlatformState {
  facebookPageId?: string;
  facebookPostType?: "feed" | "reel" | "story";
  instagramPostType?: "post" | "reel" | "story";
  youtubeTitle?: string;
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

  if (selectedChannels.size === 0) return null;

  return (
    <div className={styles.platformFields}>
      {/* FACEBOOK */}
      {selectedChannels.has("facebook") && (
        <div className={styles.row}>
          <div className={styles.platform}>Facebook</div>

          <div className={styles.field}>
            <select
              value={platformState.facebookPageId || ""}
              onChange={(e) => update("facebookPageId", e.target.value)}
            >
              <option value="">Select page</option>
              {facebookPages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <select
              value={platformState.facebookPostType || "feed"}
              onChange={(e) => update("facebookPostType", e.target.value)}
            >
              <option value="feed">Feed</option>
              <option value="reel">Reel</option>
              <option value="story">Story</option>
            </select>
          </div>
        </div>
      )}

      {/* INSTAGRAM */}
      {selectedChannels.has("instagram") && (
        <div className={styles.row}>
          <div className={styles.platform}>Instagram</div>

          <div className={styles.field}>
            <select
              value={platformState.instagramPostType || "post"}
              onChange={(e) => update("instagramPostType", e.target.value)}
            >
              <option value="post">Post</option>
              <option value="reel">Reel</option>
              <option value="story">Story</option>
            </select>
          </div>

          <div />
        </div>
      )}

      {/* YOUTUBE */}
      {selectedChannels.has("youtube") && (
        <div className={styles.row}>
          <div className={styles.platform}>YouTube</div>

          <div className={styles.field}>
            <input
              type="text"
              placeholder="Video title"
              value={platformState.youtubeTitle || ""}
              onChange={(e) => update("youtubeTitle", e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <select
              value={platformState.youtubeType || "video"}
              onChange={(e) => update("youtubeType", e.target.value)}
            >
              <option value="video">Video</option>
              <option value="shorts">Shorts</option>
            </select>
          </div>
        </div>
      )}

      {/* TWITTER */}
      {selectedChannels.has("twitter") && (
        <div className={`${styles.row} ${styles.textRow}`}>
          <div className={styles.platform}>Twitter</div>

          <div className={styles.textOnly}>
            Post will be published as a standard Tweet. Supported media:
            images (JPG, PNG, GIF) and videos (MP4).
          </div>
        </div>
      )}
    </div>
  );
}
