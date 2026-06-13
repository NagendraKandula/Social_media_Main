import { MediaItem } from "../../types";
import type { PreviewAccount } from "../DynamicPreview";
import MediaPreviewGrid from "./MediaPreviewGrid";
import { toPreviewText } from "./previewText";
import styles from "../../styles/ThreadsPreview.module.css";
import {
  FiHeart,
  FiMessageCircle,
  FiPlus,
  FiRepeat,
  FiSend,
  FiUser,
} from "react-icons/fi";
import { FaThreads } from "react-icons/fa6";

interface Props {
  content: string;
  files: MediaItem[];
  account?: PreviewAccount;
}

const getDisplayName = (account?: PreviewAccount) =>
  account?.username || account?.name || "jofer_latee";

function ProfileAvatar({ account }: { account?: PreviewAccount }) {
  if (account?.profilePic) {
    return (
      <img
        src={account.profilePic}
        alt={getDisplayName(account)}
        className={styles.avatarImage}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    );
  }

  return <FiUser className={styles.avatarFallback} aria-hidden="true" />;
}

export default function ThreadsPreview({ content, files, account }: Props) {
  const captionText = toPreviewText(content);
  const displayName = getDisplayName(account);

  return (
    <div className={styles.wrap}>
      <div className={styles.platformLabel}>
        <FaThreads />
        <span>Threads</span>
      </div>

      <article className={styles.postCard}>
        <div className={styles.avatarRail}>
          <div className={styles.avatar}>
            <ProfileAvatar account={account} />
            <span className={styles.followBadge}>
              <FiPlus aria-hidden="true" />
            </span>
          </div>
        </div>

        <div className={styles.postBody}>
          <header className={styles.header}>
            <strong>{displayName}</strong>
            <span>21h</span>
          </header>

          {captionText && <p className={styles.caption}>{captionText}</p>}

          <div className={styles.mediaCard}>
            <MediaPreviewGrid files={files} limit={10} />
          </div>

          <footer className={styles.actions}>
            <FiHeart aria-label="Like" />
            <FiMessageCircle aria-label="Reply" />
            <FiRepeat aria-label="Repost" />
            <FiSend aria-label="Share" />
          </footer>
        </div>
      </article>
    </div>
  );
}
