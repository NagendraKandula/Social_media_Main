import React, { useState, useRef, useMemo, useEffect } from "react";
import { Bold, Italic, Underline, Smile, Link as LinkIcon } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import styles from "../styles/ContentEditor.module.css";
import { EffectiveEditorRules } from "../utils/resolveEditorRules";

type ValidationMap = Record<string, string[]>;

export interface ContentEditorProps {
  content: string;
  onContentChange: (value: string) => void;
  files: any[]; 
  onFilesChange: (files: any[]) => void;
  effectiveRules: EffectiveEditorRules;
  validation: ValidationMap;
  isReadOnly?: boolean; 
}

export default function ContentEditor({
  content,
  onContentChange,
  files,
  onFilesChange,
  effectiveRules,
  isReadOnly = false, 
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
  const focusEditor = () => {
    if (!isReadOnly) editorRef.current?.focus();
  };

  const getPlainTextLength = () =>
    editorRef.current?.innerText.length || 0;

  /* ---------- Input ---------- */
  const handleInput = () => {
    if (isReadOnly || !editorRef.current) return;
    onContentChange(editorRef.current.innerHTML);
  };

  /* ---------- Rich Text ---------- */
  const applyCommand = (command: string, value?: string) => {
    if (isReadOnly) return;
    focusEditor();
    document.execCommand(command, false, value);
    handleInput();
  };

  const insertLink = () => {
    if (isReadOnly) return;
    focusEditor();
    const url = prompt("Enter URL");
    if (!url) return;
    document.execCommand("createLink", false, url);
    handleInput();
  };

  const insertText = (text: string) => {
    if (isReadOnly) return;
    focusEditor();
    document.execCommand("insertText", false, text);
    handleInput();
  };

  /* ---------- Media & URLs ---------- */
  const filePreviews = useMemo(() => {
    return files.map((file: any) => {
      const isNativeFile = typeof File !== 'undefined' && (file instanceof File || file instanceof Blob);
      
      const fileUrl = isNativeFile 
        ? URL.createObjectURL(file) 
        : (file.url || file.preview || file.mediaUrl || file.secureUrl);

      const mimeType = file.type || file.mimeType || '';

      return {
        file,
        url: fileUrl,
        isImage: mimeType.startsWith("image/"),
      };
    });
  }, [files]);

  // ✅ MEMORY LEAK FIX: Revoke Blob URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      filePreviews.forEach((preview) => {
        if (preview.url && preview.url.startsWith('blob:')) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, [filePreviews]);

  /* ---------- Counts ---------- */
  const charCount = getPlainTextLength();
  const maxLength = effectiveRules?.text?.maxLength;
  const overLimit = maxLength && charCount > maxLength;

  return (
    <div className={styles.editorCard} style={{ opacity: isReadOnly ? 0.8 : 1 }}>
      {/* Toolbar */}
      <div className={styles.toolbar} style={{ pointerEvents: isReadOnly ? 'none' : 'auto', opacity: isReadOnly ? 0.5 : 1 }}>
        <div className={styles.toolbarLeft}>
          <button onClick={() => applyCommand("bold")} disabled={isReadOnly}><Bold size={16} /></button>
          <button onClick={() => applyCommand("italic")} disabled={isReadOnly}><Italic size={16} /></button>
          <button onClick={() => applyCommand("underline")} disabled={isReadOnly}><Underline size={16} /></button>
          <button onClick={insertLink} disabled={isReadOnly}><LinkIcon size={16} /></button>
          <button onClick={() => insertText("#")} disabled={isReadOnly}>#</button>
          <button onClick={() => insertText("@")} disabled={isReadOnly}>@</button>
          <button onClick={() => setShowEmojiPicker(v => !v)} disabled={isReadOnly}>
            <Smile size={16} />
          </button>
        </div>
      </div>

      {showEmojiPicker && !isReadOnly && (
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
        contentEditable={!isReadOnly}
        ref={editorRef}
        onInput={handleInput}
        suppressContentEditableWarning
        data-placeholder={isReadOnly ? "" : "Write your post..."}
        style={{ cursor: isReadOnly ? 'default' : 'text', background: isReadOnly ? '#fafafa' : '#fff' }}
      />

      {/* Media previews */}
      {filePreviews.length > 0 && (
        <div className={styles.mediaGrid}>
          {filePreviews.map((p, i) => (
            <div key={i} className={styles.mediaItem}>
              
              {/* ✅ VIDEO UX UPGRADE: Show actual video player for video types */}
              {p.isImage ? (
                <img src={p.url} alt="preview" />
              ) : (
                <video 
                  src={p.url} 
                  controls 
                  style={{ width: '100%', maxHeight: '120px', borderRadius: '4px', objectFit: 'cover' }} 
                />
              )}

              {!isReadOnly && (
                <button onClick={() => onFilesChange(files.filter((_, idx) => idx !== i))}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className={styles.footerInfo}>
        {!isReadOnly ? (
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
        ) : (
          <div style={{ color: '#888', fontSize: '12px', fontStyle: 'italic' }}>
            Published Post - Read Only
          </div>
        )}

        <span className={overLimit ? styles.overLimit : undefined}>
          {charCount}{maxLength ? ` / ${maxLength}` : ""} chars
        </span>
      </div>
    </div>
  );
}