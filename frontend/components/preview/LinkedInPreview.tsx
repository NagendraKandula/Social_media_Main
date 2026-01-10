interface Props {
  content: string;
  mediaUrl?: string;
}

export default function LinkedInPreview({ content, mediaUrl }: Props) {
  return (
    <div>
      <p>{content || "Share your thoughts…"}</p>
      {mediaUrl && <small>🔗 {mediaUrl}</small>}
    </div>
  );
}
