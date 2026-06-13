import { useEffect, useState } from "react";
import { MediaItem } from "../../types";
import type { PreviewAccount } from "../DynamicPreview";
import MediaPreviewGrid from "./MediaPreviewGrid";
import styles from "../../styles/YouTubePreview.module.css";
import {
  FaCommentAlt,
  FaPlay,
  FaShare,
  FaStar,
  FaThumbsDown,
  FaThumbsUp,
  FaYoutube,
} from "react-icons/fa";

interface Props {
  title?: string;
  description?: string;
  files: MediaItem[];
  account?: PreviewAccount;
  postType?: "video" | "shorts";
}

export default function YouTubePreview({
  title,
  description,
  files,
  account,
  postType = "video",
}: Props) {
  const video = files.find((f) => f.type === "video");
  const channelName = account?.username || account?.name || title || "Bantubilli siva s...";
  const channelAvatar = account?.profilePic;
  const [videoRatio, setVideoRatio] = useState<number | null>(null);
  const isShorts = postType === "shorts";
  const hasInvalidShortsRatio =
    isShorts && videoRatio !== null && (videoRatio < 9 / 16 || videoRatio > 1);

  useEffect(() => {
    setVideoRatio(null);

    if (!video?.url || video.type !== "video") return;

    const media = document.createElement("video");
    media.preload = "metadata";
    media.src = video.url as string;

    const handleLoadedMetadata = () => {
      if (media.videoWidth > 0 && media.videoHeight > 0) {
        setVideoRatio(media.videoWidth / media.videoHeight);
      }
    };

    media.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      media.removeEventListener("loadedmetadata", handleLoadedMetadata);
      media.removeAttribute("src");
      media.load();
    };
  }, [video?.url, video?.type]);

  if (isShorts) {
    return (
      <div className={styles.wrap}>
        <div className={styles.platformLabel}>
          <FaYoutube />
          <span>YouTube Shorts</span>
        </div>

        {hasInvalidShortsRatio && (
          <div className={styles.warning}>
            Video dimensions are invalid. Aspect ratio must be between 9:16 (vertical) and 1:1 (square).
          </div>
        )}

        <article className={styles.shortsFrame}>
          <div className={styles.shortsMedia}>
            <MediaPreviewGrid files={video ? [video] : []} limit={1} variant="youtube" />
          </div>

          <div className={styles.shortsPlay}>
            <FaPlay />
          </div>

          <aside className={styles.shortsActions}>
            <span><FaThumbsUp />Like</span>
            <span><FaThumbsDown />Dislike</span>
            <span><FaCommentAlt />Comment</span>
            <span><FaShare />Share</span>
          </aside>

          <footer className={styles.shortsFooter}>
            {channelAvatar ? (
              <img
                src={channelAvatar}
                alt={channelName}
                className={styles.channelAvatar}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span className={styles.channelFallback}>
                <FaStar />
              </span>
            )}
            <strong>
              @{channelName}
            </strong>
            <button>
              Subscribe
            </button>
            <span className={styles.shortBadge}>
              <FaStar />
            </span>
          </footer>
        </article>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.platformLabel}>
        <FaYoutube />
        <span>YouTube</span>
      </div>

      <article className={styles.videoWarningCard}>
        <FaYoutube className={styles.videoWarningIcon} />
        <h3>Preview available for Shorts only</h3>
        <p>
          YouTube video posts can still be published, but this preview panel only
          supports YouTube Shorts. Select <strong>Shorts</strong> to see the preview.
        </p>
      </article>
    </div>
  );
}
