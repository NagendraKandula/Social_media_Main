import React, { useState, useRef, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, BadgeCheck, ChartNoAxesColumnIncreasing, Crop, X } from "lucide-react";
import styles from "../styles/ContentEditor.module.css";
import Dragdrop from "./Dragdrop";
import Toolbar from "./Toolbar";
import { PlatformRecommendation } from "../types";
import { PLATFORM_RULES, Platform } from "../config/platformRules";
import { EffectiveEditorRules } from "../utils/resolveEditorRules";
import { getStableObjectUrl } from "../utils/mediaObjectUrl";
import {
  areDimensionOnlyErrors,
  getCropOutputFormat,
  getNewImageIndices,
} from "../utils/cropValidation.mjs";
import {
  getImageFilter,
  getImageTransform,
  sharpenPixelData,
} from "../utils/imageEditEffects.mjs";
import {
  createCropBox,
  getCropPixels,
  moveCropBox,
  resizeCropBox,
} from "../utils/cropGeometry.mjs";

const LazyEmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => <div>Loading emojis...</div>,
});

type ValidationMap = Record<string, string[]>;
type CropSession = {
  originalFiles: any[];
  remainingIndices: number[];
};
type CropBox = { x: number; y: number; width: number; height: number };
type CropHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
type CropInteraction = {
  mode: "move" | "resize";
  handle?: CropHandle;
  startClientX: number;
  startClientY: number;
  startBox: CropBox;
};

const createDefaultImageEffects = () => ({
  rotation: 0,
  mirror: false,
  flip: false,
  blur: false,
  sharpen: false,
  enhance: false,
  grayscale: false,
  invert: false,
});

const CROP_RATIOS = [
  {
    label: "Portrait 3:4",
    sizeLabel: "3:4",
    value: 3 / 4,
    outputWidth: 1080,
    outputHeight: 1440,
  },
  {
    label: "Portrait 4:5",
    sizeLabel: "4:5",
    value: 4 / 5,
    outputWidth: 1080,
    outputHeight: 1350,
  },
  {
    label: "Square",
    sizeLabel: "1:1",
    value: 1,
    outputWidth: 1080,
    outputHeight: 1080,
  },
  {
    label: "Landscape",
    sizeLabel: "1080:566",
    value: 1080 / 566,
    outputWidth: 1080,
    outputHeight: 566,
  },
  {
    label: "Custom",
    sizeLabel: "Custom",
    value: null,
    outputWidth: null,
    outputHeight: null,
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
  getImageFitWarnings?: (newFiles: File[]) => string[] | Promise<string[]>;
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
  getImageFitWarnings,
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
  const [cropBox, setCropBox] = useState<CropBox>({ x: 12.5, y: 0, width: 75, height: 100 });
  const [cropImageDimensions, setCropImageDimensions] = useState({ width: 0, height: 0 });
  const [imageEffects, setImageEffects] = useState(createDefaultImageEffects);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [areRecommendationsDismissed, setAreRecommendationsDismissed] = useState(false);
  const [isCharLimitAlertDismissed, setIsCharLimitAlertDismissed] = useState(false);
  const [cropSession, setCropSession] = useState<CropSession | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const cropPreviewRef = useRef<HTMLDivElement>(null);
  const cropInteractionRef = useRef<CropInteraction | null>(null);
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

    if (editorRef.current.innerHTML !== content) {
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

    const fitWarnings = getImageFitWarnings
      ? await getImageFitWarnings(selectedFiles)
      : [];

    if (fitWarnings.length > 0) {
      alert(
        `Image fit warning:\n\n${fitWarnings.join("\n\n")}\n\nThe image will still be added.`
      );
    }

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
    setCropImageDimensions({ width: 0, height: 0 });
    setImageEffects(createDefaultImageEffects());
  };

  const toggleImageEffect = (
    effect: "mirror" | "flip" | "blur" | "sharpen" | "enhance" | "grayscale" | "invert"
  ) => {
    setImageEffects((current) => ({ ...current, [effect]: !current[effect] }));
  };

  const rotateImage = () => {
    setImageEffects((current) => ({
      ...current,
      rotation: (current.rotation + 45) % 360,
    }));
  };

  const closeCrop = () => {
    setCropTargetIndex(null);
    cropInteractionRef.current = null;
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
    if (ratio.value && cropImageDimensions.width && cropImageDimensions.height) {
      setCropBox(
        createCropBox(
          cropImageDimensions.width,
          cropImageDimensions.height,
          ratio.value
        )
      );
    }
  };

  const getCropPointer = (event: React.PointerEvent<HTMLElement>) => {
    const preview = cropPreviewRef.current;
    if (!preview) return null;

    const rect = preview.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
      rect,
    };
  };

  const startCropInteraction = (
    event: React.PointerEvent<HTMLElement>,
    mode: "move" | "resize",
    handle?: CropHandle
  ) => {
    event.preventDefault();
    event.stopPropagation();
    cropInteractionRef.current = {
      mode,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBox: cropBox,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateCropFromPointer = (event: React.PointerEvent<HTMLElement>) => {
    const interaction = cropInteractionRef.current;
    const pointer = getCropPointer(event);
    if (!interaction || !pointer) return;

    if (interaction.mode === "move") {
      const deltaX = ((event.clientX - interaction.startClientX) / pointer.rect.width) * 100;
      const deltaY = ((event.clientY - interaction.startClientY) / pointer.rect.height) * 100;
      setCropBox(moveCropBox(interaction.startBox, deltaX, deltaY));
      return;
    }

    setCropBox(
      resizeCropBox(
        interaction.startBox,
        interaction.handle,
        pointer.x,
        pointer.y,
        cropImageDimensions.width / cropImageDimensions.height,
        cropRatio.value
      )
    );
  };

  const stopCropInteraction = (event: React.PointerEvent<HTMLElement>) => {
    cropInteractionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
      const sourceCrop = getCropPixels(
        cropBox,
        image.naturalWidth,
        image.naturalHeight
      );
      const outputWidth = cropRatio.outputWidth || sourceCrop.width;
      const outputHeight = cropRatio.outputHeight || sourceCrop.height;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(url);
        closeCrop();
        return;
      }

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      context.save();
      context.translate(outputWidth / 2, outputHeight / 2);
      context.rotate((imageEffects.rotation * Math.PI) / 180);
      context.scale(imageEffects.mirror ? -1 : 1, imageEffects.flip ? -1 : 1);
      context.filter = getImageFilter({ ...imageEffects, sharpen: false });
      context.drawImage(
        image,
        sourceCrop.x,
        sourceCrop.y,
        sourceCrop.width,
        sourceCrop.height,
        -outputWidth / 2,
        -outputHeight / 2,
        outputWidth,
        outputHeight
      );
      context.restore();

      if (imageEffects.sharpen) {
        const imageData = context.getImageData(0, 0, outputWidth, outputHeight);
        imageData.data.set(
          sharpenPixelData(imageData.data, outputWidth, outputHeight)
        );
        context.putImageData(imageData, 0, 0);
      }

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

      <Toolbar
        activeFormats={activeFormats}
        charCount={charCount}
        maxLength={maxLength}
        overLimit={Boolean(overLimit)}
        showCharacterCount={true}
        isReadOnly={isReadOnly}
        onApplyCommand={applyCommand}
        onInsertLink={insertLink}
        onInsertText={insertText}
        onToggleEmojiPicker={() => setShowEmojiPicker((visible) => !visible)}
        onOpenAIAssistant={onOpenAIAssistant}
      />

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
                  {cropSession ? "Crop to upload" : "Edit Image"}
                </h3>
                <p>
                  {cropRatio.label}
                  {cropRatio.outputWidth && cropRatio.outputHeight
                    ? ` · ${cropRatio.outputWidth}x${cropRatio.outputHeight}`
                    : " · Drag the handles to choose a custom crop"}
                </p>
              </div>
              <button type="button" onClick={cancelCrop} aria-label="Close crop">
                ×
              </button>
            </div>

            <div className={styles.cropStage}>
              <div
                ref={cropPreviewRef}
                className={styles.cropPreview}
                style={{
                  aspectRatio: cropImageDimensions.width && cropImageDimensions.height
                    ? `${cropImageDimensions.width} / ${cropImageDimensions.height}`
                    : "1 / 1",
                  width: cropImageDimensions.width && cropImageDimensions.height
                    ? `min(100%, 760px, ${(62 * cropImageDimensions.width) / cropImageDimensions.height}vh)`
                    : "min(100%, 620px)",
                }}
              >
                <img
                  src={cropTargetPreview.url}
                  alt="Crop preview"
                  onLoad={(event) => {
                    const dimensions = {
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    };
                    setCropImageDimensions(dimensions);
                    if (cropRatio.value) {
                      setCropBox(
                        createCropBox(
                          dimensions.width,
                          dimensions.height,
                          cropRatio.value
                        )
                      );
                    }
                  }}
                  style={{
                    transform: getImageTransform({
                      zoom: 1,
                      rotation: imageEffects.rotation,
                      mirror: imageEffects.mirror,
                      flip: imageEffects.flip,
                    }),
                    filter: getImageFilter(imageEffects),
                  }}
                />
                <div
                  className={styles.cropSelection}
                  style={{
                    left: `${cropBox.x}%`,
                    top: `${cropBox.y}%`,
                    width: `${cropBox.width}%`,
                    height: `${cropBox.height}%`,
                  }}
                  onPointerDown={(event) => startCropInteraction(event, "move")}
                  onPointerMove={updateCropFromPointer}
                  onPointerUp={stopCropInteraction}
                  onPointerCancel={stopCropInteraction}
                >
                  <div className={styles.cropGrid} aria-hidden="true" />
                  {(["n", "ne", "e", "se", "s", "sw", "w", "nw"] as CropHandle[]).map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      className={`${styles.cropHandle} ${styles[`cropHandle${handle.toUpperCase()}`]}`}
                      aria-label={`Resize crop ${handle}`}
                      onPointerDown={(event) => startCropInteraction(event, "resize", handle)}
                      onPointerMove={updateCropFromPointer}
                      onPointerUp={stopCropInteraction}
                      onPointerCancel={stopCropInteraction}
                    />
                  ))}
                </div>
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
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.imageEffectsGroup}>
                <span>Image adjustments</span>
                <div className={styles.imageEffectsGrid}>
                  <button type="button" onClick={rotateImage}>
                    Rotate <strong>{imageEffects.rotation}°</strong>
                  </button>
                  {([
                    ["mirror", "Mirror"],
                    ["flip", "Flip"],
                    ["blur", "Blur"],
                    ["sharpen", "Sharpen"],
                    ["enhance", "Enhance"],
                    ["grayscale", "Grayscale"],
                    ["invert", "Invert"],
                  ] as const).map(([effect, label]) => (
                    <button
                      key={effect}
                      type="button"
                      className={imageEffects[effect] ? styles.imageEffectActive : ""}
                      onClick={() => toggleImageEffect(effect)}
                      aria-pressed={imageEffects[effect]}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className={styles.cropActions}>
              <button type="button" onClick={cancelCrop}>
                Cancel
              </button>
              <button type="button" onClick={applyCrop}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={styles.footerInfo}>
        <div className={styles.mediaFooterContent}>
          {!isReadOnly && (
            <Dragdrop onFilesSelected={addMediaFiles} />
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
