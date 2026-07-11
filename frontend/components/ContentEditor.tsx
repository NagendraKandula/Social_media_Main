import React, { useState, useRef, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, BadgeCheck, Bold, ChartNoAxesColumnIncreasing, Crop, ImagePlus, Italic, Underline, Smile, Link as LinkIcon, PenLine, Sparkles, X } from "lucide-react";
import styles from "../styles/ContentEditor.module.css";
import { PlatformRecommendation } from "../types";
import { PLATFORM_RULES, Platform } from "../config/platformRules";
import { EffectiveEditorRules } from "../utils/resolveEditorRules";
import { getStableObjectUrl } from "../utils/mediaObjectUrl";
import {
  areDimensionOnlyErrors,
  getCropOutputFormat,
  getNewImageIndices,
} from "../utils/cropValidation.mjs";

const LazyEmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => <div>Loading emojis...</div>,
});

type ValidationMap = Record<string, string[]>;
type CropSession = {
  originalFiles: any[];
  remainingIndices: number[];
};

const CROP_RATIOS = [
  {
    label: "Square",
    sizeLabel: "1:1",
    value: 1,
    outputWidth: 1080,
    outputHeight: 1080,
  },
  {
    label: "Landscape",
    sizeLabel: "1.91:1",
    value: 1200 / 627,
    outputWidth: 1200,
    outputHeight: 627,
  },
];

const PLATFORM_LABELS: Partial<Record<Platform, string>> = {
  facebook: "Facebook",
  instagram: "Instagram",
  instagram_business: "Instagram",
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  youtube: "YouTube",
  threads: "Threads",
  pinterest: "Pinterest",
};

export interface ContentEditorProps {
  content: string;
  onContentChange: (value: string) => void;
  files: any[]; 
  onFilesChange: (files: any[]) => void;
  effectiveRules: EffectiveEditorRules;
  validation: ValidationMap;
  isReadOnly?: boolean; 
  validateFilesForSelectedChannels?: (nextFiles: any[]) => string[] | Promise<string[]>;
  selectedChannels?: string[];
  onOpenAIAssistant?: () => void;
  size?: "default" | "publish";
  aiRecommendations?: PlatformRecommendation[];
}

export default function ContentEditor({
  content,
  onContentChange,
  files,
  onFilesChange,
  effectiveRules,
  isReadOnly = false, 
  validateFilesForSelectedChannels,
  selectedChannels = [],
  onOpenAIAssistant,
  size = "default",
  aiRecommendations = [],
}: ContentEditorProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const [cropTargetIndex, setCropTargetIndex] = useState<number | null>(null);
  const [cropRatio, setCropRatio] = useState(CROP_RATIOS[0]);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [areRecommendationsDismissed, setAreRecommendationsDismissed] = useState(false);
  const [isCharLimitAlertDismissed, setIsCharLimitAlertDismissed] = useState(false);
  const [cropSession, setCropSession] = useState<CropSession | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropPreviewRef = useRef<HTMLDivElement>(null);
  const recommendedPlatforms = aiRecommendations
    .map((recommendation) => ({
      ...recommendation,
      rating: Math.min(5, Math.max(0, Math.round(recommendation.rating))),
    }))
    .filter((recommendation) => recommendation.rating >= 4)
    .sort((first, second) => second.rating - first.rating);
  const recommendationSignature = recommendedPlatforms
    .map((recommendation) => `${recommendation.platform}:${recommendation.rating}`)
    .join("|");

  useEffect(() => {
    setAreRecommendationsDismissed(false);
  }, [recommendationSignature]);

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

  const updateActiveFormats = () => {
    const selection = window.getSelection();
    if (!editorRef.current || !selection?.anchorNode || !editorRef.current.contains(selection.anchorNode)) {
      return;
    }

    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  };

  useEffect(() => {
    document.addEventListener("selectionchange", updateActiveFormats);
    return () => document.removeEventListener("selectionchange", updateActiveFormats);
  }, []);

  const getPlainTextLength = () =>
    editorRef.current?.innerText.length || 0;

  /* ---------- Input ---------- */
  const handleInput = () => {
    if (isReadOnly || !editorRef.current) return;
    onContentChange(editorRef.current.innerHTML);
  };

  const addMediaFiles = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    setMediaError(null);

    const nextFiles = [...files, ...selectedFiles];
    const validationErrors = validateFilesForSelectedChannels
      ? await validateFilesForSelectedChannels(nextFiles)
      : [];

    if (validationErrors.length > 0) {
      const pendingImageIndices = getNewImageIndices(nextFiles, files.length);

      if (
        areDimensionOnlyErrors(validationErrors) &&
        pendingImageIndices.length > 0
      ) {
        setMediaError(null);
        onFilesChange(nextFiles);
        setCropSession({
          originalFiles: [...files],
          remainingIndices: pendingImageIndices,
        });
        openCrop(pendingImageIndices[0]);
        return;
      }

      const extension = selectedFiles[0]?.name.split(".").pop()?.toUpperCase();
      const isUnsupportedType = validationErrors.some((error) =>
        /not supported|image or video/i.test(error)
      );

      setMediaError(
        isUnsupportedType
          ? `We can't quite use that type of file${extension ? ` (${extension})` : ""}. Try one of these instead: JPG, JPEG, GIF, PNG, WEBP, MOV, MP4, M4V, AVI, WEBM, or HEIC.`
          : `We couldn't upload this media. ${validationErrors.join(" ")}`
      );
      return;
    }

    onFilesChange(nextFiles);
  };

  const handleMediaSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    await addMediaFiles(selectedFiles);
  };

  const handleMediaDrop = async (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDraggingMedia(false);
    await addMediaFiles(Array.from(event.dataTransfer.files || []));
  };

  /* ---------- Rich Text ---------- */
  const applyCommand = (command: string, value?: string) => {
    if (isReadOnly) return;
    focusEditor();
    document.execCommand(command, false, value);
    handleInput();
    updateActiveFormats();
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
    setIsDraggingCrop(false);
  };

  const cancelCrop = () => {
    if (cropSession) {
      onFilesChange(cropSession.originalFiles);
      setCropSession(null);
    }

    closeCrop();
  };

  const selectCropRatio = (ratio: typeof CROP_RATIOS[number]) => {
    setCropRatio(ratio);
    setCropZoom(1);
    setCropX(50);
    setCropY(50);
  };

  const adjustCropZoom = (amount: number) => {
    setCropZoom((currentZoom) =>
      Number(Math.min(3, Math.max(1, currentZoom + amount)).toFixed(2))
    );
  };

  const updateCropFocusFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const preview = cropPreviewRef.current;
    if (!preview) return;

    const rect = preview.getBoundingClientRect();
    const nextX = ((event.clientX - rect.left) / rect.width) * 100;
    const nextY = ((event.clientY - rect.top) / rect.height) * 100;

    setCropX(Math.min(100, Math.max(0, Math.round(nextX))));
    setCropY(Math.min(100, Math.max(0, Math.round(nextY))));
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

      const outputFormat = getCropOutputFormat(file.type);

      canvas.toBlob(async (blob) => {
        URL.revokeObjectURL(url);
        if (!blob) {
          alert("Could not crop this image.");
          return;
        }

        const croppedFile = new File(
          [blob],
          file.name.replace(/\.[^.]+$/, `-${cropRatio.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${outputFormat.extension}`),
          { type: outputFormat.mimeType }
        );

        const nextFiles = [...files];
        nextFiles[cropTargetIndex] = croppedFile;

        if (cropSession && validateFilesForSelectedChannels) {
          const validationErrors =
            await validateFilesForSelectedChannels(nextFiles);
          const remainingIndices = cropSession.remainingIndices.filter(
            (index) => index !== cropTargetIndex
          );

          if (validationErrors.length === 0) {
            onFilesChange(nextFiles);
            setCropSession(null);
            closeCrop();
            return;
          }

          if (
            areDimensionOnlyErrors(validationErrors) &&
            remainingIndices.length > 0
          ) {
            onFilesChange(nextFiles);
            setCropSession({
              ...cropSession,
              remainingIndices,
            });
            openCrop(remainingIndices[0]);
            return;
          }

          onFilesChange(cropSession.originalFiles);
          setCropSession(null);
          closeCrop();
          alert(
            `This media still cannot be uploaded:\n\n${validationErrors.join('\n')}`
          );
          return;
        }

        onFilesChange(nextFiles);
        closeCrop();
      }, outputFormat.mimeType, outputFormat.quality);
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
  const charLimitWarnings = selectedChannels
    .map((channel) => channel.toLowerCase() as Platform)
    .map((platform) => {
      const max = PLATFORM_RULES[platform]?.text?.maxLength;
      if (!max || charCount <= max) return null;

      return {
        platform,
        label: PLATFORM_LABELS[platform] || platform,
        max,
        overBy: charCount - max,
      };
    })
    .filter((warning): warning is { platform: Platform; label: string; max: number; overBy: number } => Boolean(warning));
  const charLimitSignature = charLimitWarnings
    .map((warning) => `${warning.platform}:${warning.max}:${warning.overBy}`)
    .join("|");

  useEffect(() => {
    setIsCharLimitAlertDismissed(false);
  }, [charLimitSignature]);

  return (
    <div
      className={`${styles.editorCard} ${size === "publish" ? styles.publishEditorCard : ""}`}
      style={{ opacity: isReadOnly ? 0.8 : 1 }}
    >
      {/* Toolbar */}
      <div className={styles.toolbar} style={{ pointerEvents: isReadOnly ? 'none' : 'auto', opacity: isReadOnly ? 0.5 : 1 }}>
        <div className={styles.toolbarLeft}>
          <button type="button" className={activeFormats.bold ? styles.toolActive : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("bold")} disabled={isReadOnly} aria-label="Bold" title="Bold"><Bold size={18} strokeWidth={2.4} /></button>
          <button type="button" className={activeFormats.italic ? styles.toolActive : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("italic")} disabled={isReadOnly} aria-label="Italic" title="Italic"><Italic size={18} strokeWidth={2.4} /></button>
          <button type="button" className={activeFormats.underline ? styles.toolActive : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => applyCommand("underline")} disabled={isReadOnly} aria-label="Underline" title="Underline"><Underline size={18} strokeWidth={2.4} /></button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={insertLink} disabled={isReadOnly} aria-label="Add link" title="Add link"><LinkIcon size={18} strokeWidth={2.4} /></button>
          <button type="button" onClick={() => insertText("#")} disabled={isReadOnly} aria-label="Add hashtag" title="Add hashtag">#</button>
          <button type="button" onClick={() => insertText("@")} disabled={isReadOnly} aria-label="Add mention" title="Add mention">@</button>
          <button type="button" onClick={() => setShowEmojiPicker(v => !v)} disabled={isReadOnly} aria-label="Add emoji" title="Add emoji">
            <Smile size={18} strokeWidth={2.4} />
          </button>
        </div>
        <div className={styles.toolbarMeta}>
          <span className={`${styles.charCount} ${overLimit ? styles.overLimit : ""}`}>
            {charCount}{maxLength ? ` / ${maxLength}` : ""} chars
          </span>
          {onOpenAIAssistant && (
            <button
              type="button"
              className={styles.aiAssistantButton}
              onClick={onOpenAIAssistant}
              disabled={isReadOnly}
              aria-label="Open AI Assistant"
              title="Open AI Assistant"
            >
              <Sparkles size={16} aria-hidden="true" />
              <PenLine size={15} aria-hidden="true" />
              <span>AI</span>
            </button>
          )}
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

      {cropTargetPreview?.isImage && cropTargetPreview.url && (
        <div className={styles.cropOverlay}>
          <div
            className={styles.cropModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="crop-dialog-title"
          >
            <div className={styles.cropHeader}>
              <div>
                <h3 id="crop-dialog-title">
                  {cropSession ? "Crop to upload" : "Crop Image"}
                </h3>
                <p>{cropRatio.label} · {cropRatio.outputWidth}x{cropRatio.outputHeight}</p>
              </div>
              <button type="button" onClick={cancelCrop} aria-label="Close crop">
                ×
              </button>
            </div>

            <div className={styles.cropStage}>
              <div
                ref={cropPreviewRef}
                className={styles.cropPreview}
                style={{ aspectRatio: `${cropRatio.outputWidth} / ${cropRatio.outputHeight}` }}
                onPointerDown={(event) => {
                  setIsDraggingCrop(true);
                  event.currentTarget.setPointerCapture(event.pointerId);
                  updateCropFocusFromPointer(event);
                }}
                onPointerMove={(event) => {
                  if (isDraggingCrop) updateCropFocusFromPointer(event);
                }}
                onPointerUp={(event) => {
                  setIsDraggingCrop(false);
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                onPointerCancel={() => setIsDraggingCrop(false)}
              >
                <img
                  src={cropTargetPreview.url}
                  alt="Crop preview"
                  style={{
                    transform: `scale(${cropZoom})`,
                    objectPosition: `${cropX}% ${cropY}%`,
                  }}
                />
                <div className={styles.cropGrid} aria-hidden="true" />
                <div
                  className={styles.cropFocusMarker}
                  style={{ left: `${cropX}%`, top: `${cropY}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className={styles.cropControls}>
              <div className={styles.cropRecommendations}>
                <span>Crop ratio</span>
                <div className={styles.recommendationGrid}>
                  {CROP_RATIOS.map((ratio) => (
                    <button
                      key={ratio.label}
                      type="button"
                      className={cropRatio.label === ratio.label ? styles.selectedRecommendation : ""}
                      onClick={() => selectCropRatio(ratio)}
                    >
                      <span>{ratio.sizeLabel}</span>
                      <strong>{ratio.label}</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.cropToolGroup}>
                <span>
                  Zoom <strong>{cropZoom.toFixed(2)}x</strong>
                </span>
                <div className={styles.zoomControls}>
                  <button type="button" onClick={() => adjustCropZoom(-0.1)}>
                    -
                  </button>
                  <div className={styles.zoomMeter}>
                    <span style={{ width: `${((cropZoom - 1) / 2) * 100}%` }} />
                  </div>
                  <button type="button" onClick={() => adjustCropZoom(0.1)}>
                    +
                  </button>
                </div>
              </div>

            </div>

            <div className={styles.cropActions}>
              <button type="button" onClick={cancelCrop}>
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
        <div className={styles.mediaFooterContent}>
          {!isReadOnly && (
            <>
            <button
              type="button"
              className={`${styles.uploadBox} ${isDraggingMedia ? styles.uploadBoxDragging : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDraggingMedia(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDraggingMedia(false)}
              onDrop={handleMediaDrop}
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
              onChange={handleMediaSelection}
            />
            </>
          )}

          {filePreviews.length > 0 && (
            <div className={styles.mediaGrid}>
              {filePreviews.map((preview, index) => (
                <div key={index} className={styles.mediaItem}>
                  {preview.isImage ? (
                    <img src={preview.url} alt="Uploaded media preview" />
                  ) : (
                    <video
                      src={preview.url}
                      controls
                      className={styles.mediaVideo}
                    />
                  )}

                  {!isReadOnly && (
                    <>
                      {preview.isImage && preview.file instanceof File && (
                        <button
                          type="button"
                          className={styles.cropButton}
                          onClick={() => openCrop(index)}
                          aria-label="Crop image"
                          title="Crop image"
                        >
                          <Crop size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => onFilesChange(files.filter((_, fileIndex) => fileIndex !== index))}
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

          {!isReadOnly && charLimitWarnings.length > 0 && !isCharLimitAlertDismissed && (
            <div className={`${styles.mediaRecommendations} ${styles.charLimitAlert}`} role="alert" aria-label="Selected channel character limit warning">
              <div className={styles.mediaRecommendationContent}>
                <span className={`${styles.mediaRecommendationLabel} ${styles.charLimitLabel}`}>
                  <AlertTriangle size={18} aria-hidden="true" />
                  Character limit exceeded
                </span>
                <div className={styles.mediaRecommendationList}>
                  {charLimitWarnings.map((warning) => (
                    <span
                      key={warning.platform}
                      className={`${styles.mediaRecommendationChip} ${styles.charLimitChip}`}
                      title={`${warning.label} allows ${warning.max} characters. Remove ${warning.overBy} characters.`}
                      tabIndex={0}
                      aria-label={`${warning.label}: ${charCount} of ${warning.max} characters. Remove ${warning.overBy} characters.`}
                    >
                      {warning.label}
                      <strong>{charCount} / {warning.max}</strong>
                      <span>{warning.overBy} over</span>
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className={styles.mediaRecommendationClose}
                onClick={() => setIsCharLimitAlertDismissed(true)}
                aria-label="Dismiss character limit warning"
                title="Dismiss"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          )}

          {!isReadOnly && recommendedPlatforms.length > 0 && !areRecommendationsDismissed && (
              <div className={styles.mediaRecommendations} role="status" aria-label="Recommended channels">
                <div className={styles.mediaRecommendationContent}>
                  <span className={styles.mediaRecommendationLabel}>
                    <BadgeCheck size={18} aria-hidden="true" />
                    Recommended channels
                  </span>
                  <div className={styles.mediaRecommendationList}>
                    {recommendedPlatforms.map((recommendation) => {
                      const matchPercentage = Math.round((recommendation.rating / 5) * 100);

                      return (
                        <span
                          key={recommendation.platform}
                          className={styles.mediaRecommendationChip}
                          title={`${matchPercentage}% match. ${recommendation.reason}`}
                          tabIndex={0}
                          aria-label={`${recommendation.platform}: ${matchPercentage}% match. ${recommendation.reason}`}
                        >
                          {recommendation.platform}
                          <strong>{matchPercentage}% match</strong>
                          <ChartNoAxesColumnIncreasing size={13} aria-hidden="true" />
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.mediaRecommendationClose}
                  onClick={() => setAreRecommendationsDismissed(true)}
                  aria-label="Dismiss recommended channels"
                  title="Dismiss"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </div>
            )}
        </div>

        {mediaError && !isReadOnly && (
          <div className={styles.mediaError} role="alert">
            <AlertTriangle size={20} aria-hidden="true" />
            <p>{mediaError}</p>
            <button
              type="button"
              className={styles.mediaRecommendationClose}
              onClick={() => setMediaError(null)}
              aria-label="Dismiss upload error"
              title="Dismiss"
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        )}

        {isReadOnly && (
          <div style={{ color: '#888', fontSize: '12px', fontStyle: 'italic' }}>
            Published Post - Read Only
          </div>
        )}

      </div>
    </div>
  );
}
