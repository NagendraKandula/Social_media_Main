// components/FacebookPreview.tsx
import React from "react";
import DOMPurify from "dompurify";
import styles from "../styles/FacebookPreview.module.css";

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
}

interface FacebookPreviewProps {
  content?: string; // optional
  mediaItems?: MediaItem[]; // optional
}

export default function FacebookPreview({
  content = '',
  mediaItems = [] // 👈 fallback to empty array
}: FacebookPreviewProps) {
  return (
    <div className={styles.facebookPost}>
      {/* Header */}
      <div className={styles.postHeader}>
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg"
          alt="Facebook"
          className={styles.logo}
        />
        <div>
          <strong>Facebook</strong>
          <div className={styles.timestamp}>Just now</div>
        </div>
        <div className={styles.moreOptions}>⋯</div>
      </div>

      {/* Content */}
      {content && (
        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      )}

      {/* Media — Only first item shown (like Facebook) */}
      {mediaItems.length > 0 && (
        <div className={styles.mediaContainer}>
          {mediaItems[0].type === 'image' ? (
            <img
              src={mediaItems[0].url}
              alt="post media"
              className={styles.media}
            />
          ) : (
            <video
              src={mediaItems[0].url}
              controls
              className={styles.media}
            />
          )}
        </div>
      )}

      {/* Action Bar */}
      <div className={styles.actionBar}>
        <button className={styles.actionBtn}>Like</button>
        <button className={styles.actionBtn}>Comment</button>
        <button className={styles.actionBtn}>Share</button>
      </div>
    </div>
  );
}