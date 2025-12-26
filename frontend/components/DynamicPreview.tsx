// components/DynamicPreview.tsx
import React, { useMemo, useEffect } from "react";
import styles from "../styles/DynamicPreview.module.css";
import DOMPurify from "dompurify";
import FacebookPreview from "./FacebookPreview";
import TwitterPreview from "./TwitterPreview";
import InstagramPreview from "./InstagramPreview";
import LinkedInPreview from "./LinkedInPreview";
import PinterestPreview from "./PinterestPreview";
import ThreadsPreview from "./ThreadsPreview";
import YouTubePreview from "./YouTubePreview";


interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
}

interface DynamicPreviewProps {
  selectedPlatforms: string[];
  content: string;
  mediaFiles: File[];
  onPublish: () => void;
  onSaveDraft: () => void;
  onSchedule: () => void;
}

export default function DynamicPreview({
  selectedPlatforms,
  content,
  mediaFiles,
}: DynamicPreviewProps) {
  const mediaPreviews: MediaItem[] = useMemo(() => {
    return mediaFiles.map((file, index) => ({
      id: `file-${index}`,
      url: URL.createObjectURL(file),
      type: file.type.startsWith("image/") ? "image" : "video",
    }));
  }, [mediaFiles]);

  useEffect(() => {
    return () => {
      mediaPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [mediaPreviews]);

  const hasContent = content.trim() !== "" || mediaPreviews.length > 0;

  const primaryPlatform = selectedPlatforms[0];

  const renderPreview = () => {
    switch (primaryPlatform) {
      case "facebook":
        return <FacebookPreview content={content} mediaItems={mediaPreviews} />;
      case "twitter":
        return <TwitterPreview content={content} mediaItems={mediaPreviews} />;
      case "instagram":
        return <InstagramPreview content={content} mediaItems={mediaPreviews} />;
      case "linkedin":
        return <LinkedInPreview content={content} mediaItems={mediaPreviews} />;
      case "pinterest":
        return <PinterestPreview content={content} mediaItems={mediaPreviews} />;
      case "threads":
        return <ThreadsPreview content={content} mediaItems={mediaPreviews} />;
      case "youtube":
        return <YouTubePreview content={content} mediaItems={mediaPreviews} />;
      default:
        return (
          <>
            {content && (
              <div
                className={styles.previewText}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(content),
                }}
              />
            )}
            {mediaPreviews.length > 0 && (
              <div className={styles.previewMediaGrid}>
                {mediaPreviews.map((preview, index) => (
                  <div key={index} className={styles.previewMediaWrapper}>
                    {preview.type === "image" ? (
                      <img
                        src={preview.url}
                        alt={`preview-${index}`}
                        className={styles.previewMedia}
                      />
                    ) : (
                      <video
                        src={preview.url}
                        controls
                        className={styles.previewMedia}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
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
              <div className={styles.postContent}>{renderPreview()}</div>
            ) : (
              <div className={styles.welcomeMessage}>Hi, welcome!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
