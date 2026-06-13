import { MediaItem } from "../../types";
import type { PreviewAccount } from "../DynamicPreview";
import MediaPreviewGrid from "./MediaPreviewGrid";
import { toPreviewText } from "./previewText";
import styles from "../../styles/FacebookPreview.module.css";
import { FaFacebook, FaGlobeAmericas, FaPlay } from "react-icons/fa";
import {
  FiMessageCircle,
  FiMoreHorizontal,
  FiSend,
  FiSearch,
  FiShare2,
  FiThumbsUp,
  FiX,
} from "react-icons/fi";

interface Props {
  content: string;
  files: MediaItem[];
  account?: PreviewAccount;
  postType?: "feed" | "reel" | "story";
}

const getDisplayName = (account?: PreviewAccount) =>
  account?.name || account?.username || "Retail shop";

export default function FacebookPreview({
  content,
  files,
  account,
  postType = "feed",
}: Props) {
  const captionText = toPreviewText(content);
  const displayName = getDisplayName(account);
  const avatarSrc = account?.profilePic || "/profile.png";

  if (postType === "reel") {
    return (
      <div className={styles.reelWrap}>
        <div className={styles.reelFrame}>
          <div className={styles.reelMedia}>
            <MediaPreviewGrid files={files.slice(0, 1)} limit={1} variant="facebook-reel" />
          </div>

          <div className={styles.reelTopActions}>
            <FiSearch aria-label="Search" />
            <img
              src={avatarSrc}
              alt={displayName}
              className={styles.reelTopAvatar}
              onError={(event) => {
                event.currentTarget.src = "/profile.png";
              }}
            />
          </div>

          <div className={styles.reelPlay}>
            <FaPlay />
          </div>

          <div className={styles.reelSideActions}>
            <FiThumbsUp aria-label="Like reel" />
            <FiMessageCircle aria-label="Comment reel" />
            <FiShare2 aria-label="Share reel" />
            <FiMoreHorizontal aria-label="More options" />
          </div>

          <div className={styles.reelInfo}>
            <div className={styles.reelMeta}>
              <img
                src={avatarSrc}
                alt={displayName}
                className={styles.reelAvatar}
                onError={(event) => {
                  event.currentTarget.src = "/profile.png";
                }}
              />
              <strong>{displayName}</strong>
              <FaGlobeAmericas aria-label="Public" />
            </div>

            {captionText && <p className={styles.reelCaption}>{captionText}</p>}
          </div>

          <div className={styles.reelCommentBar}>Add comment...</div>
        </div>
      </div>
    );
  }

  if (postType === "story") {
    return (
      <div className={styles.storyWrap}>
        <div className={styles.storyFrame}>
          <div className={styles.storyMedia}>
            <MediaPreviewGrid files={files.slice(0, 1)} limit={1} variant="facebook-reel" />
          </div>

          <div className={styles.storyHeader}>
            <img
              src={avatarSrc}
              alt={displayName}
              className={styles.storyAvatar}
              onError={(event) => {
                event.currentTarget.src = "/profile.png";
              }}
            />
            <strong>{displayName}</strong>
            <span>21h</span>
          </div>

          <div className={styles.storyTopActions}>
            <FiMoreHorizontal aria-label="More options" />
            <FiX aria-label="Close story" />
          </div>

          <div className={styles.storyPlay}>
            <FaPlay />
          </div>

          {captionText && <p className={styles.storyCaption}>{captionText}</p>}

          <div className={styles.storyReplyBar}>
            <button type="button" className={styles.storyShareBtn} aria-label="Share story">
              <FiShare2 />
            </button>
            <div className={styles.storyInput}>
              <FiMessageCircle aria-hidden="true" />
              <span>Send message...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.platformLabel}>
        <FaFacebook />
        <span>Facebook</span>
      </div>

      <article className={styles.card}>
        <header className={styles.header}>
          <img
            src={avatarSrc}
            alt={displayName}
            className={styles.avatar}
            onError={(event) => {
              event.currentTarget.src = "/profile.png";
            }}
          />

          <div className={styles.profileText}>
            <strong>{displayName}</strong>
            <span>
              Just Now · <FaGlobeAmericas />
            </span>
          </div>

          <FiMoreHorizontal className={styles.menu} aria-label="More options" />
        </header>

        {captionText && (
          <p className={styles.caption}>
            {captionText}
          </p>
        )}

        <div className={styles.mediaFrame}>
          <MediaPreviewGrid files={files} />
        </div>

        <footer className={styles.actions}>
          <span><FiThumbsUp />Like</span>
          <span><FiMessageCircle />Comment</span>
          <span><FiShare2 />Share</span>
        </footer>
      </article>
    </div>
  );
}
