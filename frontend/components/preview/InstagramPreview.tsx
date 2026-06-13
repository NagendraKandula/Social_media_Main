import { MediaItem } from "../../types";
import type { PreviewAccount } from "../DynamicPreview";
import MediaPreviewGrid from "./MediaPreviewGrid";
import styles from "../../styles/InstagramPreview.module.css";
import { toPreviewText } from "./previewText";
import { FaInstagram, FaPlay, FaUserCircle } from "react-icons/fa";
import {
  FiBookmark,
  FiHeart,
  FiMessageCircle,
  FiMoreHorizontal,
  FiRepeat,
  FiSend,
} from "react-icons/fi";

interface Props {
  content: string;
  files: MediaItem[];
  postType?: "post" | "reel" | "story";
  account?: PreviewAccount;
}

const getDisplayName = (account?: PreviewAccount) =>
  account?.username || account?.name || "i_____maggie";

function ProfileAvatar({
  account,
  className,
}: {
  account?: PreviewAccount;
  className: string;
}) {
  if (account?.profilePic) {
    return (
      <img
        src={account.profilePic}
        alt={getDisplayName(account)}
        className={className}
        onError={(event) => {
          event.currentTarget.src = "/profile.png";
        }}
      />
    );
  }

  return <FaUserCircle className={className} />;
}

export default function InstagramPreview({ content, files, postType = "post", account }: Props) {
  const captionText = toPreviewText(content);
  const displayName = getDisplayName(account);

  if (postType === "story") {
    return (
      <div className={styles.storyWrap}>
        <div className={styles.storyFrame}>
          <div className={styles.storyProgress}>
            <span />
          </div>

          <div className={styles.storyHeader}>
            <ProfileAvatar account={account} className={styles.storyAvatar} />
            <strong>{displayName}</strong>
            <span>21h</span>
          </div>

          <div className={styles.storyMedia}>
            <MediaPreviewGrid files={files.slice(0, 1)} limit={1} variant="instagram-story" />
          </div>

          {captionText && (
            <p className={styles.storyCaption}>{captionText}</p>
          )}

          <div className={styles.storyActions}>
            <div className={styles.replyBox}>Send message</div>
            <FiHeart className={styles.storyHeart} aria-label="Like story" />
            <FiSend aria-label="Send story" />
          </div>
        </div>
      </div>
    );
  }

  if (postType === "reel") {
    return (
      <div className={styles.reelWrap}>
        <div className={styles.reelFrame}>
          <div className={styles.reelMedia}>
            <MediaPreviewGrid files={files.slice(0, 1)} limit={1} variant="instagram-reel" />
          </div>

          <div className={styles.reelPlay}>
            <FaPlay />
          </div>

          <div className={styles.reelActions}>
            <FiHeart aria-label="Like reel" />
            <FiMessageCircle aria-label="Comment reel" />
            <FiRepeat aria-label="Repost reel" />
            <FiSend aria-label="Share reel" />
            <FiMoreHorizontal aria-label="More options" />
            <ProfileAvatar account={account} className={styles.reelMiniAvatar} />
          </div>

          {captionText && (
            <p className={styles.reelCaption}>{captionText}</p>
          )}

          <div className={styles.reelAccount}>
            <ProfileAvatar account={account} className={styles.reelAccountAvatar} />
            <strong>{displayName}</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.platformLabel}>
        <FaInstagram />
        <span>Instagram</span>
      </div>

      <article className={styles.card}>
        <header className={styles.postHeader}>
          <ProfileAvatar account={account} className={styles.avatar} />
          <strong className={styles.username}>{displayName}</strong>
          <span className={styles.menu}>...</span>
        </header>

        <div className={styles.mediaFrame}>
          <MediaPreviewGrid files={files} limit={10} variant="instagram" />
        </div>

        <footer>
          <div className={styles.actions}>
            <FiHeart aria-label="Like" />
            <FiMessageCircle aria-label="Comment" />
            <FiRepeat aria-label="Repost" />
            <FiSend aria-label="Share" />
            <FiBookmark className={styles.save} aria-label="Save" />
          </div>
          {captionText && (
            <p className={styles.caption}>
              <strong>{displayName}</strong> {captionText}
            </p>
          )}
        </footer>
      </article>
    </div>
  );
}
