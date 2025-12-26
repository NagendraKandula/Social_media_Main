import React from "react";
import DOMPurify from "dompurify";
import {
  MessageCircle,
  Repeat2,
  Heart,
  Bookmark,
  Share,
  MoreHorizontal,
  Play,
  Twitter,
} from "lucide-react";
import styles from "../styles/TwitterPreview.module.css";

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
}

interface TwitterPreviewProps {
  content: string;
  mediaItems: MediaItem[];
}

export default function TwitterPreview({ content, mediaItems }: TwitterPreviewProps) {
  const hasMedia = mediaItems.length > 0;
  const media = mediaItems[0]; // Show first media only

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.profile}>
          <div className={styles.icon}>
            <Twitter size={16} color="white" />
          </div>
          <div>
            <h3 className={styles.username}>Twitter/X</h3>
            <p className={styles.handle}>@twitter</p>
          </div>
        </div>
        <MoreHorizontal size={20} className={styles.more} />
      </div>

      {/* Content */}
      <div className={styles.content}>
        {content && (
          <p
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
          />
        )}

        {hasMedia && (
          <div className={styles.media}>
            {media.type === "image" ? (
              <img
                src={media.url}
                alt="Preview media"
                className={styles.image}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-4-4"/></svg>';
                }}
              />
            ) : (
              <div className={styles.videoContainer}>
                <img
                  src={media.url.replace(/\.(mp4|webm|ogg)$/i, ".jpg")}
                  alt="Video thumbnail"
                  className={styles.videoThumbnail}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = "none";
                    const parent = img.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="${styles.fallbackVideo}">
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                        </div>
                      `;
                    }
                  }}
                />
                <Play size={32} className={styles.playIcon} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.action}>
          <MessageCircle size={16} />
          <span>3</span>
        </button>
        <button className={styles.action}>
          <Repeat2 size={16} />
          <span>1</span>
        </button>
        <button className={styles.action}>
          <Heart size={16} />
          <span>7</span>
        </button>
        <button className={styles.action}>
          <Bookmark size={16} />
        </button>
        <button className={styles.action}>
          <Share size={16} />
        </button>
      </div>
    </div>
  );
}
