import { MediaItem } from "../../types";

interface Props {
  title?: string;
  description?: string;
  files: MediaItem[];
}

export default function YouTubePreview({
  title,
  description,
  files,
}: Props) {
  const video = files.find((f) => f.type === "video");

  return (
    <div>
      <strong>{title || "YouTube Video"}</strong>
      <p>{description}</p>

      {video && (
        <div>
          🎥 {typeof video.url === "string" ? video.url : ""}
        </div>
      )}
    </div>
  );
}
