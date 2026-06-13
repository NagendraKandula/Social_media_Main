import React, { useState, useRef, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { Bold, Crop, Italic, Underline, Smile, Link as LinkIcon } from "lucide-react";
import styles from "../styles/ContentEditor.module.css";
import { EffectiveEditorRules } from "../utils/resolveEditorRules";
import { getStableObjectUrl } from "../utils/mediaObjectUrl";

const LazyEmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => <div>Loading emojis...</div>,
});

type ValidationMap = Record<string, string[]>;

const CROP_RATIOS = [
  { label: "Square", value: 1, outputWidth: 1080, outputHeight: 1080 },
  { label: "Feed 4:5", value: 4 / 5, outputWidth: 1080, outputHeight: 1350 },
  { label: "Landscape", value: 1.91, outputWidth: 1080, outputHeight: 566 },
  { label: "Story/Reel", value: 9 / 16, outputWidth: 1080, outputHeight: 1920 },
];

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
  const [cropTargetIndex, setCropTargetIndex] = useState<number | null>(null);
  const [cropRatio, setCropRatio] = useState(CROP_RATIOS[0]);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
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
        ? getStableObjectUrl(file) 
        : (file.url || file.preview || file.mediaUrl || file.secureUrl || file.fileUrl || file.downloadUrl || file.publicUrl || file.assetUrl);

      const type = (file.type || '').toString().toLowerCase();
      const mimeType = (file.mimeType || '').toString().toLowerCase();
      const mediaType = (file.mediaType || '').toString().toLowerCase();
      const isVideo = type === "video" || type.startsWith("video/") || mimeType.startsWith("video/") || mediaType === "video";

      return {
        file,
        url: fileUrl,
        isImage: !isVideo,
      };
    });
  }, [files]);

  const cropTargetPreview =
    cropTargetIndex !== null ? filePreviews[cropTargetIndex] : undefined;

  const openCrop = (index: number) => {
    setCropTargetIndex(index);
    setCropRatio(CROP_RATIOS[0]);
    setCropZoom(1);
    setCropX(50);
    setCropY(50);
  };

  const closeCrop = () => {
    setCropTargetIndex(null);
  };

  const applyCrop = async () => {
    if (cropTargetIndex === null) return;

    const file = files[cropTargetIndex];
    if (!file || !(file instanceof File) || !file.type.startsWith("image/")) {
      closeCrop();
      return;
    }

    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      const outputWidth = cropRatio.outputWidth;
      const outputHeight = cropRatio.outputHeight;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(url);
        closeCrop();
        return;
      }

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const sourceRatio = image.naturalWidth / image.naturalHeight;
      const targetRatio = outputWidth / outputHeight;
      let sourceWidth = image.naturalWidth;
      let sourceHeight = image.naturalHeight;

      if (sourceRatio > targetRatio) {
        sourceWidth = image.naturalHeight * targetRatio;
      } else {
        sourceHeight = image.naturalWidth / targetRatio;
      }

      sourceWidth /= cropZoom;
      sourceHeight /= cropZoom;

      const maxX = Math.max(0, image.naturalWidth - sourceWidth);
      const maxY = Math.max(0, image.naturalHeight - sourceHeight);
      const sourceX = (cropX / 100) * maxX;
      const sourceY = (cropY / 100) * maxY;

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputWidth,
        outputHeight
      );

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) {
          closeCrop();
          return;
        }

        const extension = file.type === "image/png" ? "png" : "jpg";
        const croppedFile = new File(
          [blob],
          file.name.replace(/\.[^.]+$/, `-${cropRatio.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${extension}`),
          { type: file.type === "image/png" ? "image/png" : "image/jpeg" }
        );

        const nextFiles = [...files];
        nextFiles[cropTargetIndex] = croppedFile;
        onFilesChange(nextFiles);
        closeCrop();
      }, file.type === "image/png" ? "image/png" : "image/jpeg", 0.92);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      alert("Could not crop this image.");
      closeCrop();
    };

    image.src = url;
  };

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
          <LazyEmojiPicker
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
                <>
                  {p.isImage && p.file instanceof File && (
                    <button
                      type="button"
                      className={styles.cropButton}
                      onClick={() => openCrop(i)}
                      aria-label="Crop image"
                      title="Crop image"
                    >
                      <Crop size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => onFilesChange(files.filter((_, idx) => idx !== i))}
                    aria-label="Remove media"
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {cropTargetPreview?.isImage && cropTargetPreview.url && (
        <div className={styles.cropOverlay}>
          <div className={styles.cropModal}>
            <div className={styles.cropHeader}>
              <h3>Crop Image</h3>
              <button type="button" onClick={closeCrop} aria-label="Close crop">
                ×
              </button>
            </div>

            <div className={styles.cropStage}>
              <div
                className={styles.cropPreview}
                style={{ aspectRatio: `${cropRatio.outputWidth} / ${cropRatio.outputHeight}` }}
              >
                <img
                  src={cropTargetPreview.url}
                  alt="Crop preview"
                  style={{
                    transform: `scale(${cropZoom})`,
                    objectPosition: `${cropX}% ${cropY}%`,
                  }}
                />
              </div>
            </div>

            <div className={styles.cropControls}>
              <label>
                Ratio
                <select
                  value={cropRatio.label}
                  onChange={(event) => {
                    const selected = CROP_RATIOS.find((ratio) => ratio.label === event.target.value);
                    if (selected) setCropRatio(selected);
                  }}
                >
                  {CROP_RATIOS.map((ratio) => (
                    <option key={ratio.label} value={ratio.label}>
                      {ratio.label} ({ratio.outputWidth}x{ratio.outputHeight})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Zoom
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={cropZoom}
                  onChange={(event) => setCropZoom(Number(event.target.value))}
                />
              </label>

              <label>
                Horizontal
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cropX}
                  onChange={(event) => setCropX(Number(event.target.value))}
                />
              </label>

              <label>
                Vertical
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cropY}
                  onChange={(event) => setCropY(Number(event.target.value))}
                />
              </label>
            </div>

            <div className={styles.cropActions}>
              <button type="button" onClick={closeCrop}>
                Cancel
              </button>
              <button type="button" onClick={applyCrop}>
                Apply crop
              </button>
            </div>
          </div>
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
