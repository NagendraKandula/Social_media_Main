import { MediaItem } from "../../types";

interface Props {
  content: string;
  files: MediaItem[];
}

export default function LinkedInPreview({ content, files }: Props) {
  const firstMedia = files[0];

  return (
    <div>
      <p>{content || "Share your thoughts…"}</p>

      {firstMedia && (
        <div>
          {firstMedia.type === "video" ? "🎥" : "🖼"}{" "}
          {typeof firstMedia.url === "string" ? firstMedia.url : ""}
        </div>
      )}
    </div>
  );
}
