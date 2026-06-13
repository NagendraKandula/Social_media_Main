import { MediaItem } from "../../types";
import MediaPreviewGrid from "./MediaPreviewGrid";
import { toPreviewText } from "./previewText";
import styles from "../../styles/TwitterPreview.module.css";

interface Props {
  content: string;
  files: MediaItem[];
}

export default function TwitterPreview({ content, files }: Props) {
  const media = files.slice(0, 4);
  const captionText = toPreviewText(content);

  return (
    <article className={styles.card}>
      <div className={styles.content}>
        {captionText && <p className={styles.caption}>{captionText}</p>}

        <div className={styles.media}>
          <MediaPreviewGrid files={media} />
        </div>
      </div>
    </article>
  );
}
