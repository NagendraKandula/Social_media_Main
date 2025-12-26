// InstagramPreview.tsx
import React from "react";
import DOMPurify from "dompurify";
import { FaInstagram } from 'react-icons/fa';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import styles from "../styles/InstagramPreview.module.css";

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnail?: string;
}

interface InstagramPreviewProps {
  content?: string; // optional
  mediaItems?: MediaItem[]; // optional
  username?: string;
  timeAgo?: string;
}

export default function InstagramPreview({
  content = "",
  mediaItems = [], // 👈 Safe fallback
  username = "instagram",
  timeAgo = "JUST NOW",
}: InstagramPreviewProps) {
  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <FaInstagram size={24} color="#E1306C" />
          </div>
          <span className={styles.username}>{username}</span>
        </div>
        <MoreHorizontal className={styles.moreIcon} />
      </div>

      {/* Media */}
      {mediaItems.length > 0 && (
        <div className={styles.media}>
          {mediaItems.map((item) => (
            <div key={item.id} className={styles.mediaItem}>
              {item.type === "image" ? (
                <img src={item.url} alt="Instagram media" className={styles.image} />
              ) : (
                <video controls className={styles.video}>
                  <source src={item.url} />
                </video>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Caption */}
      {content && (
        <div
          className={styles.caption}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button><Heart size={24} /></button>
        <button><MessageCircle size={24} /></button>
        <button><Send size={24} /></button>
        <div className={styles.spacer}></div>
        <button><Bookmark size={24} /></button>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.likes}>Liked by user123 and others</div>
        <div className={styles.time}>{timeAgo}</div>
      </div>
    </div>
  );
}