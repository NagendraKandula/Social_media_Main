import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Link,
  Hash,
  AtSign,
  Smile,
  Send,
  Save,
  Clock,
} from "lucide-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import styles from "../styles/ContentEditor.module.css";

export interface ContentEditorProps {
  content: string;
  onContentChange: (value: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  onPublish: () => void;
  onSaveDraft: () => void;
  onSchedule: () => void;
  aiAssistantEnabled: boolean;
  setAiAssistantEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ContentEditor({
  content,
  onContentChange,
  files,
  onFilesChange,
  onPublish,
  onSaveDraft,
  onSchedule,
  aiAssistantEnabled, // This prop will now be used
  setAiAssistantEnabled, // This prop will now be used
}: ContentEditorProps) {
  // ❌ MISTAKE: This internal state was overriding the parent's state. It has been removed.
  // const [aiEnabled, setAiEnabled] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ File previews
  const filePreviews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        isImage: file.type.startsWith("image/"),
      })),
    [files]
  );

  useEffect(() => {
    return () => {
      filePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [filePreviews]);

  // Update innerHTML only when content changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const handleFileUpload = (fileList: FileList | null) => {
    if (fileList) {
      const uploadedFiles = Array.from(fileList);
      onFilesChange([...files, ...uploadedFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  // Rich text commands
  const applyCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    onContentChange(editorRef.current?.innerHTML || "");
  };

  // Emoji insertion
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const emojiNode = document.createTextNode(emojiData.emoji);
    range.insertNode(emojiNode);

    // Move cursor after emoji
    range.setStartAfter(emojiNode);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    onContentChange(editor.innerHTML);
    setShowEmojiPicker(false);
  };

  const handleInput = () => {
    onContentChange(editorRef.current?.innerHTML || "");
  };

  return (
    <div className={styles.contentEditor}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <h2 className={styles.editorTitle}>Create & Edit Content</h2>
        <div className={styles.aiToggle}>
          <span className={styles.toggleLabel}>AI Assistant</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              // ✅ FIX: Use the prop from the parent component
              checked={aiAssistantEnabled}
              // ✅ FIX: Call the state updater function from the parent
              onChange={() => setAiAssistantEnabled(!aiAssistantEnabled)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button
          className={styles.toolBtn}
          title="Bold"
          onClick={() => applyCommand("bold")}
        >
          <Bold className={styles.toolIcon} />
        </button>
        <button
          className={styles.toolBtn}
          title="Italic"
          onClick={() => applyCommand("italic")}
        >
          <Italic className={styles.toolIcon} />
        </button>
        <button
          className={styles.toolBtn}
          title="Underline"
          onClick={() => applyCommand("underline")}
        >
          <Underline className={styles.toolIcon} />
        </button>
        <button
          className={styles.toolBtn}
          title="Insert Link"
          onClick={() => {
            const url = prompt("Enter URL:");
            if (url) applyCommand("createLink", url);
          }}
        >
          <Link className={styles.toolIcon} />
        </button>
        <button
          className={styles.toolBtn}
          title="Hashtag"
          onClick={() => applyCommand("insertText", "#hashtag ")}
        >
          <Hash className={styles.toolIcon} />
        </button>
        <button
          className={styles.toolBtn}
          title="Mention"
          onClick={() => applyCommand("insertText", "@username ")}
        >
          <AtSign className={styles.toolIcon} />
        </button>
        <button
          className={styles.toolBtn}
          title="Emoji"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
        >
          <Smile className={styles.toolIcon} />
        </button>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className={styles.emojiPicker}>
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {/* Editable Area */}
      <div
        ref={editorRef}
        className={`${styles.editorTextarea} ${!content ? styles.empty : ""}`}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
      ></div>

      <div className={styles.editorFooter}>
        <span className={styles.charCount}>
          {editorRef.current?.innerText.length || 0} characters
        </span>
        <span className={styles.reachInfo}>Estimated reach: 3,000</span>
      </div>

      {/* Media Section */}
      <div className={styles.mediaSection}>
        <label className={styles.mediaLabel}>Media</label>
        <div className={styles.mediaGrid}>
          {filePreviews.map((preview, index) => (
            <div key={index} className={styles.mediaItem}>
              {preview.isImage ? (
                <img
                  src={preview.url}
                  alt={preview.file.name}
                  className={styles.mediaPreview}
                />
              ) : (
                <div className={styles.videoPlaceholder}>🎥 Video</div>
              )}
              <button
                onClick={() => handleRemoveFile(index)}
                className={styles.removeBtn}
                aria-label="Remove file"
              >
                ✕
              </button>
              <p className={styles.fileName}>{preview.file.name}</p>
              <p className={styles.fileSize}>
                {(preview.file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
          ))}
        </div>

        <div
          className={`${styles.uploadArea} ${isDragging ? styles.dragging : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <span>+ Add More Files</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className={styles.uploadInput}
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <button
          className={`${styles.actionBtn} ${styles.publishBtn}`}
          onClick={onPublish}
        >
          <Send size={16} />
          Publish
        </button>
        <button className={styles.actionBtn} onClick={onSaveDraft}>
          <Save size={16} />
          Save Draft
        </button>
        <button className={styles.actionBtn} onClick={onSchedule}>
          <Clock size={16} />
          Schedule
        </button>
      </div>
    </div>
  );
}