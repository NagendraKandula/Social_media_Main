import React from "react";
import styles from "../styles/DynamicPreview.module.css";
import PreviewResolver from "./preview/PreviewResolver";
import { Channel } from "./ChannelSelector";

interface Props {
  selectedPlatforms: Channel[];
  content: string;
  mediaFiles: File[];
  platformState?: Record<string, any>;
}

export default function DynamicPreview({
  selectedPlatforms,
  content,
  mediaFiles,
  platformState = {},
}: Props) {
  if (selectedPlatforms.length === 0) {
    return (
      <div className={styles.empty}>
        Select a platform to preview your post
      </div>
    );
  }

  return (
    <div className={styles.previewContainer}>
      {selectedPlatforms.map((platform) => (
        <div key={platform} className={styles.previewCard}>
          <div className={styles.previewHeader}>
            {platform.toUpperCase()} Preview
          </div>

          <PreviewResolver
            channel={platform}
            content={content}
            files={mediaFiles}
            platformState={platformState}
          />
        </div>
      ))}
    </div>
  );
}
