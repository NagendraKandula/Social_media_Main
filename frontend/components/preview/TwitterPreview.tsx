import { MediaItem } from "../../types";

interface Props {
  content: string;
  files: MediaItem[];
}

export default function TwitterPreview({ content, files }: Props) {
  const media = files.slice(0, 4);

  return (
    <div>
      <p>{content}</p>

      <div>
        {media.map((item) =>
          item.type === "image" ? (
            <img
              key={item.id}
              src={item.url as string}
              alt="preview"
            />
          ) : (
            <video
              key={item.id}
              src={item.url as string}
              muted
            />
          )
        )}
      </div>
    </div>
  );
}
