interface Props {
  content: string;
  files: File[];
}

export default function TwitterPreview({ content, files }: Props) {
  return (
    <div>
      <p>{content || "What's happening?"}</p>
      {files.length > 0 && <small>🖼 {files[0].name}</small>}
    </div>
  );
}
