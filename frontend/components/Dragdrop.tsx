import React, { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import styles from "../styles/ContentEditor.module.css";

interface DragdropProps {
  onFilesSelected: (files: File[]) => void | Promise<void>;
}

export default function Dragdrop({ onFilesSelected }: DragdropProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    await onFilesSelected(selectedFiles);
  };

  const handleDrop = async (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await onFilesSelected(Array.from(event.dataTransfer.files || []));
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.uploadBox} ${isDragging ? styles.uploadBoxDragging : ""}`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        aria-label="Upload media"
      >
        <ImagePlus size={34} aria-hidden="true" />
        <span>
          Drag &amp; drop or
          <strong>select a file</strong>
        </span>
      </button>
      <input
        type="file"
        multiple
        hidden
        ref={fileInputRef}
        onChange={handleSelection}
      />
    </>
  );
}
