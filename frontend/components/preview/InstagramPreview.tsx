interface Props {
  content: string;
  mediaUrl?: string;
  mediaType?: string;
}

export default function InstagramPreview({
  content,
  mediaUrl,
  mediaType,
}: Props) {
  return (
    <div>
      <strong>{mediaType || "POST"}</strong>
      {mediaUrl && <div>📷 {mediaUrl}</div>}
      <p>{content}</p>
    </div>
  );
}
