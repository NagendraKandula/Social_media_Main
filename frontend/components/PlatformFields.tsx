// components/PlatformFields.tsx
import React from "react";
import styles from "../styles/PlatformFields.module.css";
import { Channel } from "./ChannelSelector";
import { EffectiveEditorRules } from "../utils/resolveEditorRules";

type ValidationMap = Record<string, string[]>;

export interface PlatformFieldsProps {
  selectedChannels: Channel[];
  platformState: Record<string, any>;
  setPlatformState: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  effectiveRules: EffectiveEditorRules;

  // ✅ ADD THIS
  validation: ValidationMap;
}

export default function PlatformFields({
  selectedChannels,
  platformState,
  setPlatformState,
  effectiveRules,
  validation,
}: PlatformFieldsProps) {


  const updateField = (key: string, value: any) => {
    setPlatformState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className={styles.platformFields}>
      {/* ================= YOUTUBE ================= */}
      {selectedChannels.includes("youtube") && (
        <div className={styles.section}>
          <h4>YouTube Settings</h4>

          <label>Title</label>
          <input
            type="text"
            value={platformState.youtubeTitle || ""}
            onChange={(e) => updateField("youtubeTitle", e.target.value)}
            placeholder="YouTube video title"
          />

          <label>Visibility</label>
          <select
            value={platformState.youtubeVisibility || "public"}
            onChange={(e) =>
              updateField("youtubeVisibility", e.target.value)
            }
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>
        </div>
      )}

      {/* ================= FACEBOOK ================= */}
      {selectedChannels.includes("facebook") && (
        <div className={styles.section}>
          <h4>Facebook Settings</h4>

          <label>Post Type</label>
          <select
            value={platformState.facebookType || "feed"}
            onChange={(e) =>
              updateField("facebookType", e.target.value)
            }
          >
            <option value="feed">Feed</option>
            <option value="story">Story</option>
            <option value="reel">Reel</option>
          </select>
        </div>
      )}

      {/* ================= INSTAGRAM ================= */}
      {selectedChannels.includes("instagram") && (
        <div className={styles.section}>
          <h4>Instagram Settings</h4>

          <label>Media Type</label>
          <select
            value={platformState.instagramType || "post"}
            onChange={(e) =>
              updateField("instagramType", e.target.value)
            }
          >
            <option value="post">Post</option>
            <option value="reel">Reel</option>
            <option value="story">Story</option>
          </select>
        </div>
      )}
    </div>
  );
}
