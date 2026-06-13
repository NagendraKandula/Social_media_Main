import { MediaItem } from "../../types";
import type { PreviewAccount } from "../DynamicPreview";
import MediaPreviewGrid from "./MediaPreviewGrid";
import { toPreviewText } from "./previewText";
import styles from "../../styles/LinkedInPreview.module.css";
import {
  FaGlobeAmericas,
  FaLinkedin,
} from "react-icons/fa";
import { FiMessageCircle, FiRepeat, FiSend, FiThumbsUp } from "react-icons/fi";

interface Props {
  content: string;
  files: MediaItem[];
  account?: PreviewAccount;
}

const getDisplayName = (account?: PreviewAccount) =>
  account?.name || account?.username || "Bantubilli Sai Siva Meg...";

export default function LinkedInPreview({ content, files, account }: Props) {
  const captionText = toPreviewText(content);
  const displayName = getDisplayName(account);

  return (
    <div className={styles.wrap}>
      <div className={styles.platformLabel}>
        <FaLinkedin />
        <span>LinkedIn</span>
      </div>

      <article className={styles.card}>
        <header className={styles.header}>
          <img
            src={account?.profilePic || "/profile.png"}
            alt={displayName}
            className={styles.avatar}
            onError={(event) => {
              event.currentTarget.src = "/profile.png";
            }}
          />
          <div className={styles.profileText}>
            <strong className={styles.name}>
              {displayName}
            </strong>
            <span className={styles.meta}>
              1h · <FaGlobeAmericas />
            </span>
          </div>
        </header>

        {captionText && (
          <p className={styles.caption}>
            {captionText}
          </p>
        )}

        <div className={styles.mediaFrame}>
          <MediaPreviewGrid files={files} limit={9} variant="linkedin" />
        </div>

        <footer className={styles.footer}>
          <div className={styles.actions}>
            <span className={styles.action}><FiThumbsUp />Like</span>
            <span className={styles.action}><FiMessageCircle />Comment</span>
            <span className={styles.action}><FiRepeat />Repost</span>
            <span className={styles.action}><FiSend />Send</span>
          </div>
        </footer>
      </article>
    </div>
  );
}
