import { MediaItem } from "../../types";

interface Props {
  content: string;
  files: MediaItem[];
}

export default function ThreadsPreview({ content, files }: Props) {
  const firstMedia = files[0];

  return (
    <div>
      <p>{content}</p>

      {firstMedia && (
        <div>
          {firstMedia.type === "video" ? "🎥" : "🖼"}{" "}
          {typeof firstMedia.url === "string" ? firstMedia.url : ""}
        </div>
      )}
    </div>
  );
}
