import React, { useMemo, useEffect, useState } from "react";
import styles from "../styles/DynamicPreview.module.css";
import DOMPurify from "dompurify";
import FacebookPreview from "./FacebookPreview";
import TwitterPreview from "./TwitterPreview";
import InstagramPreview from "./InstagramPreview";
import LinkedInPreview from "./LinkedInPreview";
import ThreadsPreview from "./ThreadsPreview";
import YouTubePreview from "./YouTubePreview";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev === selectedPlatforms.length - 1 ? prev : prev + 1
    );
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? 0 : prev - 1));
  };

  const currentPlatform = selectedPlatforms[currentIndex];

  const renderPreview = () => {
    switch (currentPlatform) {
      case "facebook":
        return <FacebookPreview content={content} mediaItems={mediaPreviews} />;
      case "twitter":
        return <TwitterPreview content={content} mediaItems={mediaPreviews} />;
      case "instagram":
        return <InstagramPreview content={content} mediaItems={mediaPreviews} />;
      case "linkedin":
        return <LinkedInPreview content={content} mediaItems={mediaPreviews} />;
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
          {/* Sliding Screens */}
          <div className={styles.screen}>
            {hasContent ? (
              <div
                className={styles.slidingWrapper}
                style={{
                  transform: `translateX(-${currentIndex * 100}%)`,
                }}
              >
                {selectedPlatforms.map((platform, index) => (
                  <div key={platform} className={styles.slide}>
                    {index === currentIndex && renderPreview()}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.welcomeMessage}>Hi, welcome!</div>
            )}
          </div>

          {/* Navigation Arrows Inside the Phone */}
          <button
            className={`${styles.navButtonInside} ${styles.leftInside}`}
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className={`${styles.navButtonInside} ${styles.rightInside}`}
            onClick={handleNext}
            disabled={currentIndex === selectedPlatforms.length - 1}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className={styles.platformIndicator}>
        {currentPlatform && <p>Previewing: {currentPlatform.toUpperCase()}</p>}
      </div>
    </div>
  );
}
