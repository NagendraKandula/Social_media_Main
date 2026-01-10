interface Props {
  content: string;
  files: File[];
}

export default function ThreadsPreview({ content, files }: Props) {
  return (
    <div>
      <p>{content || "Write something…"}</p>
      {files.length > 0 && <small>📎 {files[0].name}</small>}
    </div>
  );
}
