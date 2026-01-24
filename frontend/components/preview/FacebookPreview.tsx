import { MediaItem } from "../../types";

interface Props {
  content: string;
  files: MediaItem[];
}

export default function FacebookPreview({ content, files }: Props) {
  const firstMedia = files[0];

  return (
    <div>
      <p>{content}</p>

      {firstMedia && (
        <small>
          {firstMedia.type === "video" ? "🎥" : "🖼"}{" "}
          {typeof firstMedia.url === "string" ? firstMedia.url : ""}
        </small>
      )}
    </div>
  );
}
