interface Props {
  content: string;
  mediaUrl?: string;
  mediaType?: string;
}

export default function FacebookPreview({
  content,
  mediaUrl,
  mediaType,
}: Props) {
  return (
    <div>
      <p>{content}</p>
      {mediaUrl && (
        <small>
          {mediaType === "VIDEO" ? "🎥" : "🖼"} {mediaUrl}
        </small>
      )}
    </div>
  );
}
