// components/DynamicPreview.tsx
import React, { useMemo, useEffect } from "react";
import styles from "../styles/DynamicPreview.module.css";
import DOMPurify from "dompurify";
import { MediaItem } from "../types";

// Platform Previews
import FacebookPreview from "./preview/FacebookPreview";
import TwitterPreview from "./preview/TwitterPreview";
import InstagramPreview from "./preview/InstagramPreview";
import LinkedInPreview from "./preview/LinkedInPreview";
import ThreadsPreview from "./preview/ThreadsPreview";
import YouTubePreview from "./preview/YouTubePreview";

interface DynamicPreviewProps {
  selectedPlatforms: string[];
  content: string;
  mediaFiles: File[];
}

export default function DynamicPreview({
  selectedPlatforms,
  content,
  mediaFiles,
}: DynamicPreviewProps) {

  const mediaPreviews: MediaItem[] = useMemo(() => {
    return mediaFiles.map((file, index) => ({
      id: `file-${index}-${file.name}`,
      url: URL.createObjectURL(file),
      type: file.type.startsWith("image/") ? "image" : "video",
      name: file.name,
      size: file.size,
    }));
  }, [mediaFiles]);

  useEffect(() => {
    return () => {
      mediaPreviews.forEach((preview) =>
        URL.revokeObjectURL(preview.url as string)
      );
    };
  }, [mediaPreviews]);

  const primaryPlatform = selectedPlatforms[0];
  const hasContent = content.trim() !== "" || mediaPreviews.length > 0;

  const renderPlatformPreview = () => {
    switch (primaryPlatform) {
      case "facebook":
        return <FacebookPreview content={content} files={mediaPreviews} />;

      case "twitter":
        return <TwitterPreview content={content} files={mediaPreviews} />;

      case "instagram":
        return <InstagramPreview content={content} files={mediaPreviews} />;

      case "linkedin":
        return <LinkedInPreview content={content} files={mediaPreviews} />;

      case "threads":
        return <ThreadsPreview content={content} files={mediaPreviews} />;

      case "youtube":
        return (
          <YouTubePreview
            description={content}
            files={mediaPreviews}
          />
        );

      default:
        return (
          <div className={styles.defaultPreview}>
            {content && (
              <div
                className={styles.previewText}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(content),
                }}
              />
            )}
          </div>
        );
    }
  };

  return (
    <div className={styles.previewContainer}>
      <div className={styles.previewHeader}>
        <h2 className={styles.previewTitle}>Mobile Preview</h2>
        <div className={styles.platformCount}>
          {selectedPlatforms.length} platform
          {selectedPlatforms.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className={styles.phoneWrapper}>
        <div className={styles.phone}>
          <div className={styles.screen}>
            {hasContent ? (
              <div className={styles.postContent}>
                {renderPlatformPreview()}
              </div>
            ) : (
              <div className={styles.welcomeMessage}>
                <p>Preview will appear here</p>
                <span>Select a platform to see how your post looks.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
