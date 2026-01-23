import React, { useState, useRef, useMemo, useEffect } from "react";
import { Bold, Italic, Underline, Smile, Link as LinkIcon } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import styles from "../styles/ContentEditor.module.css";
import { EffectiveEditorRules } from "../utils/resolveEditorRules";

type ValidationMap = Record<string, string[]>;

export interface ContentEditorProps {
  content: string;
  onContentChange: (value: string) => void;

  files: File[];
  onFilesChange: (files: File[]) => void;

  effectiveRules: EffectiveEditorRules;
  validation: ValidationMap;
}

export default function ContentEditor({
  content,
  onContentChange,
  files,
  onFilesChange,
  effectiveRules,
}: ContentEditorProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------- Sync external content ---------- */
  useEffect(() => {
    if (!editorRef.current) return;

    const currentText = editorRef.current.innerText;
    const incomingText = new DOMParser()
      .parseFromString(content, "text/html")
      .body.innerText;

    if (currentText !== incomingText) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  /* ---------- Helpers ---------- */
  const focusEditor = () => editorRef.current?.focus();

  const getPlainTextLength = () =>
    editorRef.current?.innerText.length || 0;

  /* ---------- Input ---------- */
  const handleInput = () => {
    if (!editorRef.current) return;
    onContentChange(editorRef.current.innerHTML);
  };

  /* ---------- Rich Text ---------- */
  const applyCommand = (command: string, value?: string) => {
    focusEditor();
    document.execCommand(command, false, value);
    handleInput();
  };

  const insertLink = () => {
    focusEditor();
    const url = prompt("Enter URL");
    if (!url) return;
    document.execCommand("createLink", false, url);
    handleInput();
  };

  const insertText = (text: string) => {
    focusEditor();
    document.execCommand("insertText", false, text);
    handleInput();
  };

  /* ---------- Media ---------- */
  const filePreviews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        isImage: file.type.startsWith("image/"),
      })),
    [files]
  );

  /* ---------- Counts ---------- */
  const charCount = getPlainTextLength();
  const maxLength = effectiveRules?.text?.maxLength;
  const overLimit = maxLength && charCount > maxLength;

  return (
    <div className={styles.editorCard}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button onClick={() => applyCommand("bold")}><Bold size={16} /></button>
          <button onClick={() => applyCommand("italic")}><Italic size={16} /></button>
          <button onClick={() => applyCommand("underline")}><Underline size={16} /></button>
          <button onClick={insertLink}><LinkIcon size={16} /></button>
          <button onClick={() => insertText("#")}>#</button>
          <button onClick={() => insertText("@")}>@</button>
          <button onClick={() => setShowEmojiPicker(v => !v)}>
            <Smile size={16} />
          </button>
        </div>
      </div>

      {showEmojiPicker && (
        <div className={styles.emojiPopover}>
          <EmojiPicker
            onEmojiClick={(e) => {
              insertText(e.emoji);
              setShowEmojiPicker(false);
            }}
          />
        </div>
      )}

      {/* Editor */}
      <div
        className={styles.editor}
        contentEditable
        ref={editorRef}
        onInput={handleInput}
        suppressContentEditableWarning
        data-placeholder="Write your post..."
      />

      {/* Media previews */}
      {filePreviews.length > 0 && (
        <div className={styles.mediaGrid}>
          {filePreviews.map((p, i) => (
            <div key={i} className={styles.mediaItem}>
              {p.isImage ? <img src={p.url} alt="preview" /> : <div>🎥</div>}
              <button
                onClick={() =>
                  onFilesChange(files.filter((_, idx) => idx !== i))
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer (upload + count together) */}
      <div className={styles.footerInfo}>
        <div
          className={styles.uploadBox}
          onClick={() => fileInputRef.current?.click()}
        >
          + Add media
          <input
            type="file"
            multiple
            hidden
            ref={fileInputRef}
            onChange={(e) =>
              e.target.files &&
              onFilesChange([...files, ...Array.from(e.target.files)])
            }
          />
        </div>

        <span className={overLimit ? styles.overLimit : undefined}>
          {charCount}{maxLength ? ` / ${maxLength}` : ""} chars
        </span>
      </div>
    </div>
  );
}
