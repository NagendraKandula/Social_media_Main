import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Link,
  Hash,
  AtSign,
  Smile,
} from "lucide-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import styles from "../styles/ContentEditor.module.css";
import { EffectiveEditorRules } from "../utils/resolveEditorRules";

type ValidationMap = Record<string, string[]>;

export interface ContentEditorProps {
  content: string;
  onContentChange: (value: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  aiAssistantEnabled: boolean;
  setAiAssistantEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  effectiveRules: EffectiveEditorRules;
  validation: ValidationMap;
}

export default function ContentEditor({
  content,
  onContentChange,
  files,
  onFilesChange,
  aiAssistantEnabled,
  setAiAssistantEnabled,
  effectiveRules,
  validation,
}: ContentEditorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------- File previews ---------- */
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
    return () =>
      filePreviews.forEach((p) =>
        URL.revokeObjectURL(p.url)
      );
  }, [filePreviews]);

  /* ---------- Rule cleanup ---------- */
  useEffect(() => {
    if (effectiveRules.media.inputType !== "file") {
      onFilesChange([]);
    }
    if (effectiveRules.media.inputType !== "url") {
      setMediaUrl("");
    }
  }, [effectiveRules.media.inputType, onFilesChange]);

  /* ---------- Sync content ---------- */
  useEffect(() => {
    if (
      editorRef.current &&
      editorRef.current.innerHTML !== content
    ) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  /* ---------- Helpers ---------- */
  const applyCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    onContentChange(editorRef.current?.innerHTML || "");
  };

  const handleInput = () => {
    const text = editorRef.current?.innerText || "";

    if (
      effectiveRules.text.maxLength &&
      text.length > effectiveRules.text.maxLength
    ) {
      return;
    }

    onContentChange(editorRef.current?.innerHTML || "");
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    document.execCommand(
      "insertText",
      false,
      emojiData.emoji
    );
    onContentChange(editor.innerHTML);
    setShowEmojiPicker(false);
  };

  const handleFileUpload = (fileList: FileList | null) => {
    if (!fileList) return;
    onFilesChange([...files, ...Array.from(fileList)]);
  };

  const handleRemoveFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  /* ---------- Render ---------- */
  return (
    <div className={styles.editorCard}>
      {/* Editor header */}
      <div className={styles.editorHeader}>
        <span className={styles.editorTitle}>
          Content
        </span>

        <label className={styles.aiToggle}>
          <span>AI Assistant</span>
          <input
            type="checkbox"
            checked={aiAssistantEnabled}
            onChange={() =>
              setAiAssistantEnabled(!aiAssistantEnabled)
            }
          />
          <span className={styles.toggleSlider} />
        </label>
      </div>

      {/* Toolbar */}
      {effectiveRules.text.enabled && (
        <div className={styles.toolbar}>
          <button onClick={() => applyCommand("bold")}>
            <Bold size={16} />
          </button>
          <button onClick={() => applyCommand("italic")}>
            <Italic size={16} />
          </button>
          <button onClick={() => applyCommand("underline")}>
            <Underline size={16} />
          </button>
          <button
            onClick={() =>
              applyCommand(
                "createLink",
                prompt("Enter URL") || ""
              )
            }
          >
            <Link size={16} />
          </button>
          <button onClick={() => applyCommand("insertText", "#")}>
            <Hash size={16} />
          </button>
          <button onClick={() => applyCommand("insertText", "@")}>
            <AtSign size={16} />
          </button>
          <button
            onClick={() =>
              setShowEmojiPicker(!showEmojiPicker)
            }
          >
            <Smile size={16} />
          </button>
        </div>
      )}

      {showEmojiPicker && (
        <div className={styles.emojiPopover}>
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {/* Editor */}
      {effectiveRules.text.enabled && (
        <>
          <div
            ref={editorRef}
            className={styles.editor}
            contentEditable
            onInput={handleInput}
            suppressContentEditableWarning
          />
          <div className={styles.counter}>
            {(editorRef.current?.innerText.length || 0)}
            {effectiveRules.text.maxLength &&
              ` / ${effectiveRules.text.maxLength}`}
          </div>
        </>
      )}

      {/* Validation messages */}
      {validation.text && (
        <div className={styles.error}>
          {validation.text.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      {/* Media */}
      {effectiveRules.media.enabled && (
        <div className={styles.media}>
          <span className={styles.sectionLabel}>Media</span>

          {effectiveRules.media.inputType === "file" && (
            <>
              <div className={styles.mediaGrid}>
                {filePreviews.map((p, i) => (
                  <div key={i} className={styles.mediaItem}>
                    {p.isImage ? (
                      <img src={p.url} />
                    ) : (
                      <div>Video</div>
                    )}
                    <button
                      onClick={() => handleRemoveFile(i)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div
                className={`${styles.uploadBox} ${
                  isDragging ? styles.dragging : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                Upload media
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) =>
                    handleFileUpload(e.target.files)
                  }
                />
              </div>
            </>
          )}

          {effectiveRules.media.inputType === "url" && (
            <input
              className={styles.urlInput}
              type="url"
              placeholder="Paste public media URL"
              value={mediaUrl}
              onChange={(e) =>
                setMediaUrl(e.target.value)
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
