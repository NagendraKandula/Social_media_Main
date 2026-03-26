import { MediaItem } from "../../types";

interface Props {
  content: string;
  files: MediaItem[];
}

export default function InstagramPreview({ content, files }: Props) {
  const firstMedia = files[0];

  const postType =
    firstMedia?.type === "video" ? "REEL" : "POST";

  return (
    <div>
      <strong>{postType}</strong>

      {firstMedia && (
        <div>
          {firstMedia.type === "video" ? "🎥" : "📷"}{" "}
          {typeof firstMedia.url === "string" ? firstMedia.url : ""}
        </div>
      )}

      <p>{content}</p>
    </div>
  );
}
