import React from "react";
import DOMPurify from "dompurify";
import styles from "../styles/PinterestPreview.module.css";
import { Heart, ExternalLink, Share2, MoreHorizontal } from "lucide-react";

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
}

interface PinterestPreviewProps {
  content: string;
  mediaItems: MediaItem[];
}

export default function PinterestPreview({ content, mediaItems }: PinterestPreviewProps) {
  const hasMedia = mediaItems.length > 0;
  const media = mediaItems[0];

  return (
    <div className={styles.screenOnly}>
      {/* Screen Content */}
      <div className={styles.screenContent}>
        {hasMedia ? (
          <img
            src={media.url}
            alt="Pinterest Pin"
            className={styles.image}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src =
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><path d='M21 15l-4-4'/></svg>";
            }}
          />
        ) : (
          <div className={styles.placeholder}>📷 Add your image</div>
        )}

        {/* Save Button */}
        <button className={styles.saveButton}>
          <Heart size={20} />
        </button>

        {/* Action Bar */}
        <div className={styles.actionBar}>
          <button className={styles.visitButton}>
            <ExternalLink size={16} />
            Visit site
          </button>
          <div className={styles.shareButtons}>
            <button className={styles.shareButton}>
              <Share2 size={16} />
            </button>
            <button className={styles.expandButton}>
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Description with safe HTML rendering */}
      {content && (
        <p
          className={styles.description}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <span>pinterest.com</span>
        <button className={styles.moreButton}>
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
