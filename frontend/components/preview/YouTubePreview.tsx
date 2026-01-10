interface Props {
  title?: string;
  description?: string;
  mediaUrl?: string;
  mediaType?: string;
}

export default function YouTubePreview({
  title,
  description,
  mediaUrl,
}: Props) {
  return (
    <div>
      <h4>{title || "Video Title"}</h4>
      <p>{description}</p>
      {mediaUrl && <small>🎬 {mediaUrl}</small>}
    </div>
  );
}
