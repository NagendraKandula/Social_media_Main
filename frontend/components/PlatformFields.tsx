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

  const renderOptions = <T extends string>(
    value: T,
    options: { value: T; label: string }[],
    onChange: (value: T) => void
  ) => (
    <div className={styles.segmentedControl}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? styles.segmentActive : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className={styles.platformFields}>
      {/* FACEBOOK */}
      {selectedChannels.has("facebook") && (
        <div className={styles.row}>
          <div className={styles.platform}>Facebook</div>

          <div className={styles.field}>
            <select
              className={styles.pageSelect}
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
            {renderOptions(
              platformState.facebookPostType || "feed",
              [
                { value: "feed", label: "Feed" },
                { value: "reel", label: "Reel" },
                { value: "story", label: "Story" },
              ],
              (value) => update("facebookPostType", value)
            )}
          </div>
        </div>
      )}

      {/* INSTAGRAM */}
      {selectedChannels.has("instagram") && (
        <div className={styles.row}>
          <div className={styles.platform}>Instagram</div>

          <div className={styles.field}>
            {renderOptions(
              platformState.instagramPostType || "post",
              [
                { value: "post", label: "Post" },
                { value: "reel", label: "Reel" },
                { value: "story", label: "Story" },
              ],
              (value) => update("instagramPostType", value)
            )}
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
            {renderOptions(
              platformState.youtubeType || "video",
              [
                { value: "video", label: "Video" },
                { value: "shorts", label: "Shorts" },
              ],
              (value) => update("youtubeType", value)
            )}
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
