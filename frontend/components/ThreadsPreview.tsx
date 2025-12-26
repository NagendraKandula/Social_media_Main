import React from "react";
import DOMPurify from "dompurify";
import styles from "../styles/ThreadsPreview.module.css";
import { Heart, MessageCircle, Repeat2, Send } from "lucide-react";
import threadsIcon from "/public/threads.png";

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnail?: string;
}

interface ThreadsPreviewProps {
  content: string;
  mediaItems: MediaItem[];
}

export default function ThreadsPreview({ content, mediaItems }: ThreadsPreviewProps) {
  const hasMedia = mediaItems.length > 0;

  return (
    <div className={styles.threadsCard}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.icon}>
          <img src={threadsIcon.src} alt="Threads" />
        </div>
        <span className={styles.platform}>threads</span>
      </div>

      {/* Text Content */}
      {content && (
        <p
          className={styles.text}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      )}

      {/* Media */}
      {hasMedia && (
        <div className={styles.mediaContainer}>
          <img
            src={mediaItems[0].url}
            alt="Post media"
            className={styles.mediaImage}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src =
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><path d='M21 15l-4-4'/></svg>";
            }}
          />
          {mediaItems[0]?.type === "video" && (
            <div className={styles.playOverlay}>
              <div className={styles.playButton}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Icons */}
      <div className={styles.actionIcons}>
        <button className={styles.action}>
          <Heart size={24} />
        </button>
        <button className={styles.action}>
          <MessageCircle size={24} />
        </button>
        <button className={styles.action}>
          <Repeat2 size={24} />
        </button>
        <button className={styles.action}>
          <Send size={24} />
        </button>
      </div>
    </div>
  );
}
