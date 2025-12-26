// components/LinkedInPreview.tsx
import React from "react";
import DOMPurify from "dompurify";
import styles from "../styles/LinkedInPreview.module.css";
import {
  ThumbsUp,
  MessageCircle,
  Repeat2,
  Send,
  Globe,
  MoreHorizontal,
  Play,
  User,
} from "lucide-react";

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnail?: string;
}

interface LinkedInPreviewProps {
  content?: string;          // optional
  mediaItems?: MediaItem[];  // optional
  firstComment?: string;
}

export default function LinkedInPreview({
  content = "Hi, travel!",
  mediaItems = [], // 👈 critical fallback
  firstComment,
}: LinkedInPreviewProps) {
  const hasMedia = mediaItems.length > 0;
  const media = hasMedia ? mediaItems[0] : null;

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>in</div>
          <div>
            <div className={styles.platform}>LinkedIn</div>
            <div className={styles.time}>
              <span>now</span> • <Globe size={12} />
            </div>
          </div>
        </div>
        <MoreHorizontal className={styles.moreIcon} />
      </div>

      {/* Content */}
      <div
        className={styles.content}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
      />

      {/* Media */}
      {hasMedia && media && (
        <div className={styles.media}>
          {media.type === "image" ? (
            <img
              src={media.url}
              alt="Post media"
              className={styles.image}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.src =
                  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><path d='M21 15l-4-4'/></svg>";
              }}
            />
          ) : (
            <div className={styles.videoContainer}>
              <img
                src={media.thumbnail || media.url.replace(/\.(mp4|webm|mov|avi)$/i, ".jpg")}
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

      {/* Comment */}
      {firstComment && (
        <div className={styles.commentSection}>
          <div className={styles.profileIcon}>
            <User size={24} color="#555" />
          </div>
          <div className={styles.commentBox}>
            <span className={styles.commentName}>Matteo Giardino</span>
            <p className={styles.commentText}>{firstComment}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button>
          <ThumbsUp size={18} />
          <span>Like</span>
        </button>
        <button>
          <MessageCircle size={18} />
          <span>Comment</span>
        </button>
        <button>
          <Repeat2 size={18} />
          <span>Repost</span>
        </button>
        <button>
          <Send size={18} />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}