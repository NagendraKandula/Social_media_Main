import React, { useState, useRef, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, BadgeCheck, ChartNoAxesColumnIncreasing, Crop, X } from "lucide-react";
import styles from "../styles/ContentEditor.module.css";
import Dragdrop from "./Dragdrop";
import Toolbar from "./Toolbar";
import Cropfeature, { CropfeatureHandle } from "./Cropfeature";
import { PlatformRecommendation } from "../types";
import { PLATFORM_RULES, Platform } from "../config/platformRules";
import { EffectiveEditorRules } from "../utils/resolveEditorRules";
import { getStableObjectUrl } from "../utils/mediaObjectUrl";
import { getImageFitTargets, analyzeImageFit } from '../features/publish/imageFitAnalysis.mjs';
import { getImageDimensions } from '../features/publish/mediaValidation';
import {
  areDimensionOnlyErrors,
  getNewImageIndices,
} from "../utils/cropValidation.mjs";
import type { ImageEditDestination, MediaEditDraft } from "../features/publish/types";

const LazyEmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => <div>Loading emojis...</div>,
});

type ValidationMap = Record<string, string[]>;
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
  onMediaEditApply?: (
    file: File,
    edit: {
      cropX: number;
      cropY: number;
      cropWidth: number;
      cropHeight: number;
      rotation: number;
    },
    renderedPreview: File,
    destination: ImageEditDestination
  ) => void;
  selectedChannels?: string[];
  cropDestinations?: ImageEditDestination[];
  getSavedMediaEdit?: (file: File, destination: ImageEditDestination) => MediaEditDraft | undefined;
  onOpenAIAssistant?: () => void;
  size?: "default" | "publish";
  aiRecommendations?: PlatformRecommendation[];
  platformState?: Record<string, any>; 
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
  onMediaEditApply,
  selectedChannels = [],
  cropDestinations = [],
  getSavedMediaEdit,
  onOpenAIAssistant,
  size = "default",
  aiRecommendations = [],
  platformState = {},
}: ContentEditorProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [areRecommendationsDismissed, setAreRecommendationsDismissed] = useState(false);
  const [isCharLimitAlertDismissed, setIsCharLimitAlertDismissed] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const cropFeatureRef = useRef<CropfeatureHandle>(null);
  const [imageFitIssues, setImageFitIssues] = useState<Record<number, any[]>>({});
  
  // 🌟 Track local previews and edits to force re-renders
  const [localCropPreviews, setLocalCropPreviews] = useState<Record<number, string>>({});
  const [editCounter, setEditCounter] = useState(0);

  const handleInternalMediaEditApply = (
    file: File,
    edit: { cropX: number; cropY: number; cropWidth: number; cropHeight: number; rotation: number; },
    renderedPreview: File,
    destination: ImageEditDestination
  ) => {
    const index = files.findIndex(f => f === file || (f instanceof File && f.name === file.name));
    
    // 🌟 Update the thumbnail to show the newly cropped image
    if (index !== -1 && renderedPreview) {
      setLocalCropPreviews(prev => ({
        ...prev,
        [index]: URL.createObjectURL(renderedPreview)
      }));
    }

    // Force the warning effect to re-run
    setEditCounter(c => c + 1);

    if (onMediaEditApply) {
      onMediaEditApply(file, edit, renderedPreview, destination);
    }
  };

  useEffect(() => {
    const checkImageFits = async () => {
      const channelSet = new Set(selectedChannels);
      const targets = getImageFitTargets(channelSet, platformState);
      const newFitIssues: Record<number, any[]> = {};

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file instanceof File && file.type.startsWith('image/')) {
          try {
            const dimensions = await getImageDimensions(file);
            let issues = analyzeImageFit(dimensions, targets);
            
            // 🌟 SMART FILTERING: Remove warnings for platforms that have already been cropped!
            if (issues.length > 0 && getSavedMediaEdit) {
              issues = issues.filter(issue => {
                // Find the matching destination prop for this issue
                const dest = cropDestinations.find(d => 
                  d.platform.toLowerCase() === issue.platform.toLowerCase()
                );
                // If a saved edit exists for this platform, the warning is resolved.
                if (dest && getSavedMediaEdit(file, dest)) {
                  return false; 
                }
                return true; 
              });
            }

            if (issues.length > 0) {
              newFitIssues[i] = issues;
            }
          } catch (error) {
            console.error("Could not read dimensions for", file.name);
          }
        }
      }
      setImageFitIssues(newFitIssues);
    };

    if (files.length > 0 && selectedChannels.length > 0) {
      checkImageFits();
    } else {
      setImageFitIssues({});
    }
  }, [files, selectedChannels, platformState, cropDestinations, getSavedMediaEdit, editCounter]);

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
        cropFeatureRef.current?.open(pendingImageIndices[0], {
          originalFiles: [...files],
          remainingIndices: pendingImageIndices,
        });
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

      <Cropfeature
        ref={cropFeatureRef}
        files={files}
        onFilesChange={onFilesChange}
        cropDestinations={cropDestinations}
        getSavedMediaEdit={getSavedMediaEdit}
        validateFilesForSelectedChannels={validateFilesForSelectedChannels}
        onMediaEditApply={handleInternalMediaEditApply}
      />

      {/* Footer */}
      <div className={styles.footerInfo}>
        <div className={styles.mediaFooterContent}>
          {!isReadOnly && (
            <Dragdrop onFilesSelected={addMediaFiles} />
          )}

          {filePreviews.length > 0 && (
            <div className={styles.mediaGrid}>
              {filePreviews.map((preview, index) => {
                const issues = imageFitIssues[index];
                const needsCropping = issues && issues.length > 0;

                return (
                  <div key={index} className={styles.mediaItem} style={{ position: 'relative' }}>
                    {preview.isImage ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        {/* 🌟 Show local cropped preview if it exists */}
                        <img 
                          src={localCropPreviews[index] || preview.url} 
                          alt="Uploaded media preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                        
                        {/* 🌟 THE NEW EXPLICIT WARNING OVERLAY */}
                        {needsCropping && (
                          <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            color: 'white',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '12px',
                            textAlign: 'center',
                            zIndex: 10
                          }}>
                            <AlertTriangle size={24} color="#fca5a5" style={{ marginBottom: '8px' }} />
                            <span style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '6px' }}>
                              Crop required for:
                            </span>
                            <div style={{ fontSize: '11px', marginBottom: '12px', color: '#fecaca' }}>
                              {issues.map((i, idx) => (
                                <div key={idx}>• {i.label || i.platform}</div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                cropFeatureRef.current?.open(index);
                              }}
                              style={{
                                backgroundColor: '#dc2626',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                animation: 'pulse 2s infinite'
                              }}
                            >
                              Edit Crop
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <video
                        src={preview.url}
                        controls
                        className={styles.mediaVideo}
                      />
                    )}

                    {!isReadOnly && !needsCropping && (
                      <>
                        {preview.isImage && preview.file instanceof File && (!onMediaEditApply || cropDestinations.length > 0) && (
                          <button
                            type="button"
                            className={styles.cropButton}
                            onClick={() => cropFeatureRef.current?.open(index)}
                            aria-label="Crop image"
                            title="Crop image"
                          >
                            <Crop size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => {
                            setLocalCropPreviews(prev => {
                              const next = { ...prev };
                              delete next[index];
                              return next;
                            });
                            onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
                          }}
                          aria-label="Remove media"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
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