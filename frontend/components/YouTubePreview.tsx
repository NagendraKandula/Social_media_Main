import React from "react";
import DOMPurify from "dompurify";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  MoreHorizontal,
} from "lucide-react";
import styles from "../styles/YouTubePreview.module.css";

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnail?: string;
}

interface YouTubePreviewProps {
  content: string;
  mediaItems: MediaItem[];
}

export default function YouTubePreview({ content, mediaItems }: YouTubePreviewProps) {
  const hasMedia = mediaItems.length > 0;

  return (
    <div className={styles.youtubeCard}>
      {/* Thumbnail */}
      {hasMedia && (
        <div className={styles.thumbnailContainer}>
          <div className={styles.youtubeHeader}>YouTube</div>
          <img
            src={mediaItems[0].url}
            alt="Video thumbnail"
            className={styles.thumbnailImage}
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
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className={styles.info}>
        {content && (
          <h3
            className={styles.title}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
          />
        )}
        <div className={styles.channelInfo}>
          <span className={styles.channelName}>Username</span>
          <span className={styles.dot}>•</span>
          <span className={styles.views}>1 view</span>
          <span className={styles.dot}>•</span>
          <span className={styles.timeAgo}>Just now</span>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.action} aria-label="Like">
          <Heart size={15} />
          <span>Like</span>
        </button>
        <button className={styles.action} aria-label="Comment">
          <MessageCircle size={15} />
          <span>Comment</span>
        </button>
        <button className={styles.action} aria-label="Share">
          <Repeat2 size={15} />
          <span>Share</span>
        </button>
        <button className={styles.action} aria-label="Save">
          <Send size={15} />
          <span>Save</span>
        </button>
        <button className={styles.moreAction} aria-label="More options">
          <MoreHorizontal size={15} />
        </button>
      </div>
    </div>
  );
}
