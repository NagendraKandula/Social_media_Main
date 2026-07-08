import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import axios from "../../../lib/axios";
import styles from "../../../styles/LandingCSS/Tabs/Planning.module.css";

// --- Imported Publish Components & Hooks ---
import ChannelSelector, { Channel } from '../../../components/ChannelSelector';
import { PlatformState } from '../../../components/PlatformFields';
import { resolveEditorRules } from '../../../utils/resolveEditorRules';
import { usePostCreation } from '../../../hooks/usePostCreation';
import { addNotification } from '../../../utils/notifications';
import { AiAnalysisResult, PlatformRecommendation } from '../../../types';

const LazyContentEditor = dynamic(() => import('../../../components/ContentEditor'), {
  loading: () => <p>Loading editor...</p>,
});
const LazyPlatformFields = dynamic(() => import('../../../components/PlatformFields'), {
  loading: () => <p>Loading platform options...</p>,
});
const LazyAIAssistant = dynamic(() => import('../../../components/AIAssistant'), {
  loading: () => <p>Loading AI assistant...</p>,
});
const LazyDynamicPreview = dynamic(() => import('../../../components/DynamicPreview'), {
  loading: () => <p>Loading preview...</p>,
});

/* ─── Constants & Icons ──────────────────────────────────────── */
const PLATFORMS: Record<string, any> = {
  instagram: { label: "Instagram", color: "#E1306C", bg: "#fff0f5", border: "#f9a8c9" },
  twitter:   { label: "Twitter/X", color: "#1DA1F2", bg: "#f0f8ff", border: "#93d1f7" },
  linkedin:  { label: "LinkedIn",  color: "#0077B5", bg: "#f0f7fb", border: "#90c8e0" },
  youtube:   { label: "YouTube",   color: "#FF0000", bg: "#fff5f5", border: "#ffb3b3" },
  facebook:  { label: "Facebook",  color: "#1877F2", bg: "#f0f4ff", border: "#93aef7" },
  threads:   { label: "Threads",   color: "#000000", bg: "#f5f5f5", border: "#cccccc" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FACEBOOK_MAX_IMAGE_SIZE_BYTES = 10_000_000;
const FACEBOOK_RECOMMENDED_PNG_SIZE_BYTES = 1_000_000;
const THREADS_MAX_IMAGE_SIZE_BYTES = 8_000_000;
const THREADS_MAX_VIDEO_SIZE_BYTES = 1_000_000_000;
const LINKEDIN_MAX_IMAGE_SIZE_BYTES = 8_000_000;
const LINKEDIN_MIN_VIDEO_SIZE_BYTES = 75_000;
const LINKEDIN_MAX_VIDEO_SIZE_BYTES = 5_000_000_000;
const FACEBOOK_ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/bmp',
  'image/png',
  'image/gif',
  'image/tiff',
]);
const THREADS_ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);
const THREADS_ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime']);
const LINKEDIN_ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif']);
const LINKEDIN_ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);

const getImageDimensions = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image dimensions'));
    };
    image.src = url;
  });

const getVideoDimensions = (file: File) =>
  new Promise<{ width: number; height: number; duration: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read video metadata'));
    };
    video.src = url;
  });

const isNearRatio = (actual: number, target: number, tolerance = 0.06) =>
  Math.abs(actual - target) <= tolerance;

const matchesLinkedInRecommendedImageDimensions = ({ width, height }: { width: number; height: number }) => {
  const ratio = width / height;
  return (
    (width >= 1080 && height >= 1080 && isNearRatio(ratio, 1)) ||
    (width >= 1200 && height >= 627 && isNearRatio(ratio, 1200 / 627, 0.08)) ||
    ((width >= 1080 && height >= 1350 && isNearRatio(ratio, 4 / 5, 0.08)) ||
      (width >= 1080 && height >= 1920 && isNearRatio(ratio, 9 / 16, 0.08)))
  );
};
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const HOURS = [
  "12 AM","1 AM","2 AM","3 AM","4 AM","5 AM","6 AM","7 AM",
  "8 AM","9 AM","10 AM","11 AM","12 PM","1 PM","2 PM","3 PM",
  "4 PM","5 PM","6 PM","7 PM","8 PM","9 PM","10 PM","11 PM"
];

const PlatformIcon = ({ platform, size = 14, color }: any) => {
  const c = color || PLATFORMS[platform]?.color || "#000";
  const icons: Record<string, any> = {
    instagram: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="5" stroke={c} strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke={c} strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1" fill={c} />
      </svg>
    ),
    facebook: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    twitter: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
        <path d="M18.244 2H21.5l-7.11 8.13L22.75 22h-6.54l-5.12-6.69L5.23 22H1.97l7.61-8.7L1.56 2h6.7l4.63 6.12L18.24 2Zm-1.14 17.91h1.8L7.28 3.98H5.35l11.75 15.93Z" />
      </svg>
    ),
    linkedin: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.34V8.98h3.42v1.57h.05c.48-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.37 4.27 5.46v6.29ZM5.32 7.42a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.03H3.54V8.98H7.1v11.47ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z" />
      </svg>
    ),
    youtube: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={c}>
        <path d="M23.5 6.2a3 3 0 0 0-2.11-2.12C19.52 3.58 12 3.58 12 3.58s-7.52 0-9.39.5A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.11 2.12c1.87.5 9.39.5 9.39.5s7.52 0 9.39-.5a3 3 0 0 0 2.11-2.12A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
      </svg>
    ),
    threads: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.4 8.3c-.6-2.2-2-3.5-4.2-3.5-3 0-4.9 2.4-4.9 7.1 0 4.8 1.9 7.2 5 7.2 3.5 0 5.5-2 5.5-4.7 0-2.5-1.8-4-4.7-4.1-2.5-.1-3.9.9-3.9 2.5 0 1.4 1.1 2.4 2.7 2.4 1.7 0 2.7-1 2.7-2.6" />
        <path d="M16.9 9.9c2.3.7 3.6 2.4 3.6 4.8 0 4-3.2 6.8-8.2 6.8-5.2 0-8.8-3.7-8.8-9.5S7.1 2.5 12.2 2.5c4 0 6.7 2.1 7.7 5.8" />
      </svg>
    ),
  };
  return icons[platform] || <div style={{ width: size, height: size, background: c, borderRadius: '50%' }} />;
};

/* ─── TIMEZONE HELPER ────────────────────────────────────────── */
const toLocalInput = (dateStr: string) => {
  const d = new Date(dateStr);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const formatTimeLabel = (dateString: string) =>
  new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

const getNotificationSnippet = (content?: string, mediaCount = 0) => {
  const plainText = (content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plainText) return plainText.length > 72 ? `${plainText.slice(0, 72)}...` : plainText;
  return mediaCount > 0 ? `Media post with ${mediaCount} file${mediaCount === 1 ? '' : 's'}` : 'Untitled post';
};

/* ─── Post Card Component ────────────────────────────────────── */
const PostCard = ({ post }: any) => {
  const plt = PLATFORMS[post.platform] || PLATFORMS.instagram;
  const displayTitle = post.content ? post.content.substring(0, 25) + "..." : "Media Post";

  return (
    <div
      className={styles.postCard}
      draggable={false}
      onClick={(e) => {
        e.stopPropagation();
      }}
      title="Opening scheduled posts is temporarily disabled"
      style={{ background: plt.bg, border: `1px solid ${plt.border}` }}
    >
      <div className={styles.postCardHeader}>
        <PlatformIcon platform={post.platform} size={13} />
        <span className={styles.postCardTitle}>{displayTitle}</span>
      </div>
      <div className={styles.postCardTime}>{post.timeLabel || post.hour}</div>
      <div className={styles.postCardThumbs}>
        {[0, 1, 2].map((i) => <div key={i} className={styles.postCardThumb} />)}
      </div>
    </div>
  );
};

/* ─── Advanced Schedule Modal ────────────────────────────────── */
const AdvancedScheduleModal = ({ post, initialDate, onClose, onSave, onDelete, isReadOnly }: any) => {
  const [content, setContent] = useState(post?.content || '');
  const [files, setFiles] = useState<any[]>(post?.files || []);
  const [isScheduling, setIsScheduling] = useState(false);
  // Inside function Publish() or function Planning()
const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResult | null>(null);

const handleAnalysisComplete = (result: AiAnalysisResult) => {
    setAiAnalysis(result);
};

const handleAnalysisReset = () => {
    setAiAnalysis(null);
};

const handleApplyCaption = (caption: string) => {
    setContent(caption);
};

const handleApplyHashtags = (hashtags: string[]) => {
    setContent(prev => `${prev}\n\n${hashtags.join(" ")}`);
};

const handleAutoSelectPlatforms = (recommendations: PlatformRecommendation[]) => {
    const next = new Set<Channel>();
    recommendations.forEach((r) => {
        next.add(r.platform.toLowerCase() as Channel);
    });
    setSelectedChannels(next);
};
  
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(
    new Set(post?.platforms ? post.platforms : (post?.platform ? [post.platform as Channel] : []))
  );

  const [rightTab, setRightTab] = useState<'ai' | 'preview'>('ai');
  
  const [platformState, setPlatformState] = useState<PlatformState>(
    post?.contentMetadata?.platformOverrides?.[post?.platforms?.[0] || post?.platform] || {
      facebookPostType: 'feed',
      instagramPostType: 'post',
      youtubeType: 'video',
    }
  );

  const [scheduleDate, setScheduleDate] = useState(() => {
    if (post?.scheduledAt) return toLocalInput(post.scheduledAt);
    return initialDate || '';
  });

  const [facebookPages, setFacebookPages] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Partial<Record<Channel, any>>>({});

  const currentLocalTime = toLocalInput(new Date().toISOString());

  useEffect(() => {
    axios.get('/auth/social/active-accounts').then((res) => setAccounts(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!accounts.facebook) return;

    axios
      .get('/facebook/pages')
      .then(({ data }) => {
        setFacebookPages(data);
        if (!platformState.facebookPageId && data.length > 0) {
          setPlatformState((prev) => ({
            ...prev,
            facebookPageId: data[0].id,
          }));
        }
      })
      .catch(console.error);
  }, [accounts.facebook, platformState.facebookPageId]);

  const selectedChannelList = Array.from(selectedChannels);
  const effectiveRules = resolveEditorRules(selectedChannelList);
  const selectedFacebookPage = facebookPages.find(
    (page: any) => page.id === platformState.facebookPageId
  );

  const getFacebookValidationErrors = () => {
    if (!selectedChannels.has('facebook')) return [];

    const unsupportedImages = files.filter(
      (file) =>
        file.type?.startsWith('image/') &&
        !FACEBOOK_ALLOWED_IMAGE_TYPES.has(file.type)
    );
    const oversizedImages = files.filter(
      (file) =>
        file.type?.startsWith('image/') &&
        file.size &&
        file.size > FACEBOOK_MAX_IMAGE_SIZE_BYTES
    );
    const oversizedPngImages = files.filter(
      (file) =>
        file.type === 'image/png' &&
        file.size &&
        file.size > FACEBOOK_RECOMMENDED_PNG_SIZE_BYTES
    );

    if (unsupportedImages.length > 0) {
      return unsupportedImages.map(
        (file) =>
          `${file.name || 'Selected image'} uses an unsupported Facebook image type. Use JPEG, BMP, PNG, GIF, or TIFF.`
      );
    }

    if (oversizedImages.length > 0) {
      return oversizedImages.map(
        (file) =>
          `${file.name || 'Selected image'} is too large. Facebook photos must be less than 10 MB, so this post cannot be scheduled until you compress or replace it.`
      );
    }

    if (oversizedPngImages.length > 0) {
      return oversizedPngImages.map(
        (file) =>
          `${file.name || 'Selected image'} is a PNG larger than 1 MB. Facebook recommends PNG files stay under 1 MB or the image may appear pixelated, so this post cannot be scheduled until you compress or replace it.`
      );
    }

    return [];
  };

  const validateFilesForSelectedChannels = async (nextFiles: any[]) => {
    const errors: string[] = [];
    const imageCount = nextFiles.filter((file) => file.type?.startsWith('image/')).length;
    const videoCount = nextFiles.filter((file) => file.type?.startsWith('video/')).length;
    const hasImages = imageCount > 0;
    const hasVideos = videoCount > 0;
    const totalItems = nextFiles.length;

    nextFiles.forEach((file) => {
      if (!file.type?.startsWith('image/') && !file.type?.startsWith('video/')) {
        errors.push(`${file.name || 'Selected file'} is not supported. Upload an image or video file.`);
      }
    });

    if (selectedChannels.has('facebook')) {
      nextFiles.forEach((file) => {
        if (file.type?.startsWith('image/') && !FACEBOOK_ALLOWED_IMAGE_TYPES.has(file.type)) {
          errors.push(`${file.name || 'Selected image'} cannot be uploaded to Facebook. Use JPEG, BMP, PNG, GIF, or TIFF.`);
        }
        if (file.type?.startsWith('image/') && file.size > FACEBOOK_MAX_IMAGE_SIZE_BYTES) {
          errors.push(`${file.name || 'Selected image'} cannot be uploaded to Facebook because photos must be less than 10 MB.`);
        }
        if (file.type === 'image/png' && file.size > FACEBOOK_RECOMMENDED_PNG_SIZE_BYTES) {
          errors.push(`${file.name || 'Selected image'} cannot be uploaded to Facebook because PNG files should stay under 1 MB to avoid pixelation.`);
        }
      });
    }

    if (selectedChannels.has('instagram')) {
      if (platformState.instagramPostType === 'reel') {
        if (hasImages) {
          errors.push('Instagram Reels do not allow photos. Reels must be created from one video because Instagram publishes Reels as short-form video content.');
        }
        if (videoCount > 1 || totalItems > 1) {
          errors.push('Instagram Reels allow only one video. Remove extra media or switch Instagram to Post for carousel publishing.');
        }
      } else if (platformState.instagramPostType === 'story' && totalItems > 1) {
        errors.push('Instagram Story allows only one media file.');
      } else if (platformState.instagramPostType === 'post') {
        if (hasVideos) {
          errors.push('Instagram Post allows images only. Upload one image for a feed post or multiple images for a carousel.');
        }
        if (totalItems > 10) {
          errors.push('Instagram carousel allows a maximum of 10 media files.');
        }
      }
    }

    if (selectedChannels.has('threads')) {
      nextFiles.forEach((file) => {
        if (file.type?.startsWith('image/')) {
          if (!THREADS_ALLOWED_IMAGE_TYPES.has(file.type)) {
            errors.push(`${file.name || 'Selected image'} cannot be uploaded to Threads. Use JPEG or PNG images.`);
          }
          if (file.size > THREADS_MAX_IMAGE_SIZE_BYTES) {
            errors.push(`${file.name || 'Selected image'} cannot be uploaded to Threads because images must be 8 MB or smaller.`);
          }
        }
        if (file.type?.startsWith('video/')) {
          if (!THREADS_ALLOWED_VIDEO_TYPES.has(file.type)) {
            errors.push(`${file.name || 'Selected video'} cannot be uploaded to Threads. Use MP4 or MOV videos.`);
          }
          if (file.size > THREADS_MAX_VIDEO_SIZE_BYTES) {
            errors.push(`${file.name || 'Selected video'} cannot be uploaded to Threads because videos must be 1 GB or smaller.`);
          }
        }
      });

      if (totalItems > 10) {
        errors.push('Threads carousel allows a maximum of 10 media files.');
      }
    }

    if (selectedChannels.has('twitter')) {
      if (hasImages && hasVideos) errors.push('X does not allow mixing images and videos in one post.');
      if (videoCount > 1) errors.push('X allows only one video.');
      if (imageCount > 4) errors.push('X allows a maximum of 4 images.');
    }

    if (selectedChannels.has('linkedin')) {
      if (hasImages && hasVideos) errors.push('LinkedIn does not allow mixing images and videos in one post.');
      if (videoCount > 1) errors.push('LinkedIn allows only one video.');
      if (imageCount > 9) errors.push('LinkedIn allows a maximum of 9 images.');

      for (const file of nextFiles) {
        const typedFile = file as File;
        const canInspectFile = typeof File !== 'undefined' && typedFile instanceof File;
        if (file.type?.startsWith('image/')) {
          if (!LINKEDIN_ALLOWED_IMAGE_TYPES.has(file.type)) {
            errors.push(`${file.name || 'Selected image'} cannot be uploaded to LinkedIn. Use JPG, PNG, or static GIF images.`);
          }
          if (file.size > LINKEDIN_MAX_IMAGE_SIZE_BYTES) {
            errors.push(`${file.name || 'Selected image'} cannot be uploaded to LinkedIn because images must be 8 MB or smaller.`);
          }

          if (canInspectFile) {
            try {
              const dimensions = await getImageDimensions(typedFile);
              if (!matchesLinkedInRecommendedImageDimensions(dimensions)) {
                errors.push(
                  `${file.name || 'Selected image'} does not match LinkedIn recommended dimensions. Use square 1080x1080 or 1200x1200, landscape 1200x627, or portrait 4:5 / 9:16.`
                );
              }
            } catch {
              errors.push(`Could not read dimensions for ${file.name || 'selected image'}.`);
            }
          }
        }

        if (file.type?.startsWith('video/')) {
          if (!LINKEDIN_ALLOWED_VIDEO_TYPES.has(file.type)) {
            errors.push(`${file.name || 'Selected video'} cannot be uploaded to LinkedIn. Use MP4 or WebM video.`);
          }
          if (file.size < LINKEDIN_MIN_VIDEO_SIZE_BYTES || file.size > LINKEDIN_MAX_VIDEO_SIZE_BYTES) {
            errors.push(`${file.name || 'Selected video'} cannot be uploaded to LinkedIn because videos must be between 75 KB and 5 GB.`);
          }

          if (canInspectFile) {
            try {
              const { width, height, duration } = await getVideoDimensions(typedFile);
              const ratio = width / height;
              if (duration < 3 || duration > 600) {
                errors.push(`${file.name || 'Selected video'} must be between 3 seconds and 10 minutes for LinkedIn.`);
              }
              if (width < 256 || height < 144 || width > 4096 || height > 2304) {
                errors.push(`${file.name || 'Selected video'} must have a resolution between 256x144 and 4096x2304 for LinkedIn.`);
              }
              if (ratio < 1 / 2.4 || ratio > 2.4) {
                errors.push(`${file.name || 'Selected video'} must use a LinkedIn-supported aspect ratio between 1:2.4 and 2.4:1.`);
              }
            } catch {
              errors.push(`Could not read video metadata for ${file.name || 'selected video'}.`);
            }
          }
        }
      }
    }

    if (selectedChannels.has('youtube')) {
      if (hasImages) errors.push('YouTube requires a video file.');
      if (videoCount > 1 || totalItems > 1) errors.push('YouTube allows only one video.');
    }

    return [...new Set(errors)];
  };

  const handleSubmit = async (status: 'DRAFT' | 'SCHEDULED') => {
    if (isReadOnly || isScheduling) return; // Prevent any saves if read only or already saving
    if (selectedChannels.size === 0) return alert('Select at least one channel.');
    if (!content && files.length === 0) return alert('Add content or media.');
    if (status === 'SCHEDULED' && !scheduleDate) return alert('Please select a date and time.');

    if (status === 'SCHEDULED' && new Date(scheduleDate) < new Date()) {
       return alert('You cannot schedule a post in the past.');
    }

    const facebookErrors = getFacebookValidationErrors();
    if (facebookErrors.length > 0) {
      return alert(`Facebook media does not match publishing limits:\n\n${facebookErrors.join('\n')}`);
    }

    const platformOverrides: any = {};
    if (selectedChannels.has('facebook')) {
      platformOverrides.facebook = {
        pageId: platformState.facebookPageId,
        postType: platformState.facebookPostType,
      };
    }
    if (selectedChannels.has('instagram')) {
      platformOverrides.instagram = { postType: platformState.instagramPostType };
    }
    if (selectedChannels.has('youtube')) {
      platformOverrides.youtube = {
        title: platformState.youtubeTitle,
        postType: platformState.youtubeType,
      };
    }

    if (status === 'SCHEDULED') setIsScheduling(true);

    try {
      await onSave({
        id: post?.id,
        content,
        status,
        scheduledAt: status === 'SCHEDULED' ? new Date(scheduleDate).toISOString() : null,
        platforms: selectedChannelList,
        files,
        contentMetadata: { text: content, platformOverrides }
      });
    } finally {
      if (status === 'SCHEDULED') setIsScheduling(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={() => !isScheduling && onClose()}>
      <div className={styles.publishPage} onClick={(e) => e.stopPropagation()}>
        <div className={styles.scheduleHeader}>
          <div>
            <h2 className={styles.scheduleTitle}>
              {isReadOnly ? "View Published Post" : post ? "Edit Scheduled Post" : "Schedule New Post"}
            </h2>
          </div>
          <div className={styles.scheduleActions}>
            <input 
              type="datetime-local" 
              value={scheduleDate} 
              min={currentLocalTime} 
              onChange={(e) => setScheduleDate(e.target.value)} 
              disabled={isReadOnly || isScheduling}
              className={styles.scheduleDateInput}
            />
            {!isReadOnly && (
              <>
                {post && (
                  <button className={styles.scheduleDeleteBtn} onClick={() => onDelete(post.id)} disabled={isScheduling}>
                    Delete
                  </button>
                )}
                <button className={styles.scheduleDraftBtn} onClick={() => handleSubmit('DRAFT')} disabled={isScheduling}>
                  Save Draft
                </button>
                <button className={styles.schedulePrimaryBtn} onClick={() => handleSubmit('SCHEDULED')} disabled={isScheduling}>
                  {isScheduling ? 'Scheduling post' : 'Schedule Post'}
                </button>
              </>
            )}
            {!isScheduling && (
              <button className={styles.scheduleCloseBtn} onClick={onClose} aria-label="Close schedule post popup">
                ×
              </button>
            )}
          </div>
        </div>

        <div className={styles.scheduleBody}>
          <div className={`${styles.scheduleEditorPane} ${isReadOnly ? styles.readOnlyPane : ""}`}>
            <ChannelSelector
              accounts={accounts}
              selectedChannels={selectedChannels}
              onSelectionChange={setSelectedChannels}
              facebookPages={facebookPages}
              selectedFacebookPageId={platformState.facebookPageId}
              onFacebookPageSelect={(pageId) =>
                setPlatformState((prev) => ({ ...prev, facebookPageId: pageId }))
              }
            />
            <LazyContentEditor
              content={content}
              onContentChange={setContent}
              files={files}
              onFilesChange={setFiles}
              effectiveRules={effectiveRules}
              validation={{}}
              isReadOnly={isReadOnly}
              selectedChannels={selectedChannelList}
              validateFilesForSelectedChannels={validateFilesForSelectedChannels}
              aiRecommendations={aiAnalysis?.analysis?.recommendedPlatforms ?? []}
            />
            <LazyPlatformFields selectedChannels={selectedChannels} platformState={platformState} setPlatformState={setPlatformState} facebookPages={facebookPages} />
          </div>
          <aside className={styles.scheduleSidePane}>
            <div className={styles.scheduleTabs}>
              <button
                className={`${styles.scheduleTab} ${rightTab === 'ai' ? styles.active : ""}`}
                onClick={() => setRightTab('ai')}
              >
                AI Assistant
              </button>
              <button
                className={`${styles.scheduleTab} ${rightTab === 'preview' ? styles.active : ""}`}
                onClick={() => setRightTab('preview')}
              >
                Preview
              </button>
            </div>
            <div className={styles.scheduleSideContent}>
              {rightTab === 'ai' ? (
               <LazyAIAssistant 
  files={files}
  content={content}
  onAnalysisComplete={handleAnalysisComplete}
  onAnalysisReset={handleAnalysisReset}
  onApplyCaption={handleApplyCaption}
  onApplyHashtags={handleApplyHashtags}
  onAutoSelectPlatforms={handleAutoSelectPlatforms}
/>
              ) : (
                <LazyDynamicPreview
                  selectedPlatforms={selectedChannelList}
                  content={content}
                  mediaFiles={files}
                  facebookPostType={platformState.facebookPostType}
                  instagramPostType={platformState.instagramPostType}
                  youtubeType={platformState.youtubeType}
                  accounts={accounts}
                  facebookPage={selectedFacebookPage}
                />
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Planning Component ────────────────────────────────── */
const Planning = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState("all");
  const [view, setView] = useState("week");
  const [modal, setModal] = useState<any>(null);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [listAccounts, setListAccounts] = useState<Partial<Record<Channel, any>>>({});
  const [listFacebookPages, setListFacebookPages] = useState<any[]>([]);

  const { uploadMedia } = usePostCreation();

  useEffect(() => {
    axios
      .get('/auth/social/active-accounts')
      .then((res) => setListAccounts(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!listAccounts.facebook) return;

    axios
      .get('/facebook/pages')
      .then(({ data }) => setListFacebookPages(data))
      .catch(console.error);
  }, [listAccounts.facebook]);

  const getWeekDates = () => {
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay() + (currentWeekOffset * 7));
    sunday.setHours(0, 0, 0, 0);
    return DAYS.map((_, i) => {
      const dt = new Date(sunday);
      dt.setDate(sunday.getDate() + i);
      return dt;
    });
  };

  const weekDates = getWeekDates();
  const monthYear = weekDates[1].toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const visibleMonth = weekDates[1].getMonth();
  const visibleYear = weekDates[1].getFullYear();
  const visibleDay = weekDates.find((date) => date.toDateString() === new Date().toDateString()) || weekDates[1];
  const calendarTitle =
    view === "year"
      ? { primary: String(visibleYear), secondary: "" }
      : view === "list"
        ? { primary: "Scheduled", secondary: "Posts" }
        : { primary: monthYear.split(" ")[0], secondary: monthYear.split(" ")[1] };
  
  const dateToGrid = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay(); 
    let hourNum = date.getHours();
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const displayHour = hourNum % 12 || 12;
    return { day, hour: `${displayHour} ${ampm}`, timeLabel: formatTimeLabel(dateString) };
  };

  const gridToDate = (dayIndex: number, hourStr: string, weekOffset: number) => {
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay() + (weekOffset * 7));
    
    const targetDate = new Date(sunday);
    targetDate.setDate(sunday.getDate() + dayIndex);

    const [time, modifier] = hourStr.split(" ");
    let hours = parseInt(time, 10);
    if (hours === 12) hours = 0;
    if (modifier === "PM") hours += 12;
    
    targetDate.setHours(hours, 0, 0, 0);
    return targetDate.toISOString();
  };

  const setTimeOnDate = (date: Date, hourStr = "9 AM") => {
    const nextDate = new Date(date);
    const [time, modifier] = hourStr.split(" ");
    let hours = parseInt(time, 10);
    if (hours === 12) hours = 0;
    if (modifier === "PM") hours += 12;
    nextDate.setHours(hours, 0, 0, 0);
    return nextDate;
  };

  const openCreateForDate = (date: Date, hour = "9 AM") => {
    const targetDate = setTimeOnDate(date, hour);

    if (targetDate < new Date()) {
      alert("You cannot schedule a post in the past!");
      return;
    }

    setModal({ type: 'create', initialDate: toLocalInput(targetDate.toISOString()) });
  };

  const getPostDate = (post: any) => new Date(post.scheduledAt);

  const getPostPlatforms = (post: any) => {
    const platforms = Array.isArray(post.platforms) && post.platforms.length > 0
      ? post.platforms
      : [post.platform];

    return Array.from(new Set(platforms.filter(Boolean).map((platform: string) => platform.toLowerCase())));
  };

  const getPostAccountAvatar = (post: any, platform: Channel) => {
    const account = listAccounts[platform];

    if (platform === "facebook") {
      const pageId = post.contentMetadata?.platformOverrides?.facebook?.pageId;
      const page = listFacebookPages.find((item) => item.id === pageId);
      return (
        page?.pictureUrl ||
        page?.picture?.data?.url ||
        account?.profilePic ||
        "/profile.png"
      );
    }

    return account?.profilePic || "/profile.png";
  };

  const isSameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  const getMonthDates = () => {
    const firstOfMonth = new Date(visibleYear, visibleMonth, 1);
    const start = new Date(firstOfMonth);
    start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  };

  const fetchScheduledPosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/posting/scheduled?offset=${currentWeekOffset}`);
      const formattedPosts = response.data.map((post: any) => ({
        ...post,
        platforms: post.platforms ? post.platforms.map((p: string) => p.toLowerCase()) : [],
        platform: post.platform.toLowerCase(),
        content: post.content || "",
        status: post.status.toLowerCase(),
        ...dateToGrid(post.scheduledAt)
      }));
      setPosts(formattedPosts);
    } catch (error) {
      console.error("Failed to fetch posts", error);
    } finally {
      setLoading(false);
    }
  }, [currentWeekOffset]);

  useEffect(() => {
    fetchScheduledPosts();
  }, [fetchScheduledPosts]);

  const handleSave = async (postData: any) => {
    try {
      let mediaItems: any[] = [];

      if (postData.files && postData.files.length > 0) {
        const uploadPromises = postData.files.map(async (fileObj: any) => {
          
          if (fileObj.mediaUrl || fileObj.secureUrl) {
            return {
              mediaUrl: fileObj.mediaUrl || fileObj.secureUrl, 
              storagePath: fileObj.storagePath,
              mimeType: fileObj.mimeType,
              mediaType: fileObj.mediaType || fileObj.type,
              size: fileObj.size,
            };
          }

          const uploaded: any = await uploadMedia(fileObj);
          if (uploaded) {
            return {
              mediaUrl: uploaded.publicUrl || uploaded.url, 
              storagePath: uploaded.storagePath || uploaded.key,
              mimeType: fileObj.type,
              mediaType: fileObj.type.startsWith('video') ? 'VIDEO' : 'IMAGE',
              size: fileObj.size,
            };
          }
          return null;
        });

        const results = await Promise.all(uploadPromises);
        mediaItems = results.filter(item => item !== null);
      }

      const payload = {
        content: postData.content,
        platforms: postData.platforms,
        status: postData.status.toUpperCase(),
        scheduledAt: postData.scheduledAt,
        contentMetadata: postData.contentMetadata,
        mediaItems: mediaItems 
      };

      if (postData.id) {
        await axios.patch(`/posting/${postData.id}`, payload);
      } else {
        await axios.post('/posting/create', payload);
      }

      if (postData.status === 'SCHEDULED') {
        addNotification({
          type: 'success',
          title: postData.id ? 'Scheduled post updated' : 'Post scheduled',
          message: getNotificationSnippet(postData.content, mediaItems.length || postData.files?.length || 0),
          details: [
            ...(postData.id ? [{ label: 'Post ID', value: String(postData.id) }] : []),
            { label: 'Channels', value: postData.platforms.join(', ') },
            { label: 'Media', value: `${mediaItems.length || postData.files?.length || 0} file${(mediaItems.length || postData.files?.length || 0) === 1 ? '' : 's'}` },
            { label: 'Scheduled', value: new Date(postData.scheduledAt).toLocaleString() },
          ],
        });
      }
      
      setModal(null);
      fetchScheduledPosts();
    } catch (error) {
      console.error("Failed to save post", error);
      alert("Failed to save post");
      throw error;
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/posting/${id}`);
      setModal(null);
      fetchScheduledPosts();
    } catch (error) {
      console.error("Failed to delete post", error);
    }
  };

  const handleDrop = async (e: any, day: number, hour: string) => {
    e.preventDefault();
    const id = parseInt(e.dataTransfer.getData("postId"), 10);
    
    const targetDateStr = gridToDate(day, hour, currentWeekOffset);
    if (new Date(targetDateStr) < new Date()) {
      alert("You cannot move a post into the past!");
      setDragOverCell(null);
      return;
    }
    
    const previousPosts = [...posts];
    setPosts((ps: any) => ps.map((p: any) => (p.id === id ? { ...p, day, hour } : p)));
    setDragOverCell(null);

    try {
      await axios.patch(`/posting/${id}/reschedule`, {
        scheduledAt: targetDateStr
      });
      addNotification({
        type: 'info',
        title: 'Post rescheduled',
        message: getNotificationSnippet(previousPosts.find((post: any) => post.id === id)?.content),
        details: [
          { label: 'Post ID', value: String(id) },
          { label: 'New time', value: new Date(targetDateStr).toLocaleString() },
        ],
      });
    } catch (error: any) {
      console.error("Failed to reschedule", error);
      // Alert if they try to drag a published post
      if (error.response?.status === 403) alert(error.response.data.message);
      setPosts(previousPosts); 
    }
  };

  const filtered = activePlatform === "all" ? posts : posts.filter((p: any) => p.platforms?.includes(activePlatform) || p.platform === activePlatform);
  
  const postsByCell = useMemo(() => {
    const map: Record<string, any[]> = {};
    filtered.forEach((post: any) => {
      const key = `${post.day}-${post.hour}`;
      if (!map[key]) map[key] = [];
      map[key].push(post);
    });
    return map;
  }, [filtered]);

  const postsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    filtered.forEach((post: any) => {
      const key = getPostDate(post).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(post);
    });
    return map;
  }, [filtered]);

  const postsByMonth = useMemo(() => {
    const map: Record<number, any[]> = {};
    filtered.forEach((post: any) => {
      const date = getPostDate(post);
      if (date.getFullYear() !== visibleYear) return;
      const key = date.getMonth();
      if (!map[key]) map[key] = [];
      map[key].push(post);
    });
    return map;
  }, [filtered, visibleYear]);

  const openEditPost = (post: any) => {
    const mappedFiles = post.mediaItems ? post.mediaItems.map((item: any) => ({
      ...item,
      type: item.type || item.mimeType,
      mediaUrl: item.secureUrl || item.fileUrl || item.mediaUrl,
      preview: item.secureUrl || item.fileUrl || item.mediaUrl,
      url: item.secureUrl || item.fileUrl || item.mediaUrl
    })) : [];

    setModal({
      type: "edit",
      post: { ...post, files: mappedFiles },
      isReadOnly: post.status === 'published'
    });
  };

  const renderPost = (post: any) => (
    <PostCard
      key={post.id}
      post={post}
    />
  );

  const renderWeekView = () => (
    <div className={styles.tableWrapper}>
      <table className={styles.calTable}>
        <thead>
          <tr>
            <th className={styles.timeColHeader}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </th>
            {DAYS.map((d, i) => {
              const dt = weekDates[i];
              const isToday = dt?.toDateString() === new Date().toDateString();
              return (
                <th key={d} className={styles.dayHeader}>
                  <span className={styles.dayName}>{d}</span>
                  <span className={`${styles.dayNum} ${isToday ? styles.today : ""}`}>
                    {dt ? dt.getDate() : ""}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => (
            <tr key={hour}>
              <td className={styles.timeCell}>{hour}</td>
              {DAYS.map((_, di) => {
                const cellKey = `${di}-${hour}`;
                const cellPosts = postsByCell[cellKey] || [];

                return (
                  <td
                    key={di}
                    className={`${styles.calCell} ${dragOverCell === cellKey ? styles.dragOver : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOverCell(cellKey); }}
                    onDragLeave={() => setDragOverCell(null)}
                    onDrop={(e) => handleDrop(e, di, hour)}
                    onClick={() => openCreateForDate(weekDates[di], hour)}
                  >
                    {cellPosts.map(renderPost)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderDayView = () => {
    const dayIndex = visibleDay.getDay();

    return (
      <div className={styles.tableWrapper}>
        <table className={`${styles.calTable} ${styles.dayTable}`}>
          <thead>
            <tr>
              <th className={styles.timeColHeader}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </th>
              <th className={styles.dayHeader}>
                <span className={styles.dayName}>{DAYS[dayIndex]}</span>
                <span className={`${styles.dayNum} ${isSameDay(visibleDay, new Date()) ? styles.today : ""}`}>
                  {visibleDay.getDate()}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => {
              const cellKey = `${dayIndex}-${hour}`;
              const cellPosts = postsByCell[cellKey] || [];

              return (
                <tr key={hour}>
                  <td className={styles.timeCell}>{hour}</td>
                  <td
                    className={`${styles.calCell} ${styles.dayCell} ${dragOverCell === cellKey ? styles.dragOver : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOverCell(cellKey); }}
                    onDragLeave={() => setDragOverCell(null)}
                    onDrop={(e) => handleDrop(e, dayIndex, hour)}
                    onClick={() => openCreateForDate(visibleDay, hour)}
                  >
                    {cellPosts.map(renderPost)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDates = getMonthDates();

    return (
      <div className={styles.monthGrid}>
        {DAYS.map((day) => (
          <div key={day} className={styles.monthWeekday}>{day}</div>
        ))}
        {monthDates.map((date) => {
          const key = date.toDateString();
          const dayPosts = postsByDate[key] || [];
          const isCurrentMonth = date.getMonth() === visibleMonth;
          const isToday = isSameDay(date, new Date());

          return (
            <button
              type="button"
              key={key}
              className={`${styles.monthCell} ${!isCurrentMonth ? styles.mutedMonthCell : ""}`}
              onClick={() => openCreateForDate(date)}
            >
              <span className={`${styles.monthDayNum} ${isToday ? styles.today : ""}`}>
                {date.getDate()}
              </span>
              <div className={styles.monthPostList}>
                {dayPosts.slice(0, 3).map((post: any) => (
                  <span key={post.id} className={styles.monthPostPill}>
                    <PlatformIcon platform={post.platform} size={10} />
                    {post.content || "Media Post"}
                  </span>
                ))}
                {dayPosts.length > 3 && (
                  <span className={styles.morePosts}>+{dayPosts.length - 3} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderYearView = () => (
    <div className={styles.yearGrid}>
      {MONTHS.map((month, index) => {
        const monthPosts = postsByMonth[index] || [];
        const isCurrentMonth = index === new Date().getMonth() && visibleYear === new Date().getFullYear();

        return (
          <button
            type="button"
            key={month}
            className={`${styles.yearMonthCard} ${isCurrentMonth ? styles.currentYearMonth : ""}`}
            onClick={() => {
              const date = new Date(visibleYear, index, 1, 9, 0, 0, 0);
              openCreateForDate(date);
            }}
          >
            <span className={styles.yearMonthName}>{month}</span>
            <strong>{monthPosts.length}</strong>
            <span>{monthPosts.length === 1 ? "post" : "posts"}</span>
          </button>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className={styles.listView}>
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>No posts found for this filter.</div>
      ) : (
        [...filtered]
          .sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
          .map((post: any) => {
            const date = getPostDate(post);
            const platform = PLATFORMS[post.platform] || PLATFORMS.instagram;
            const postPlatforms = getPostPlatforms(post);

            return (
              <button
                type="button"
                key={post.id}
                className={styles.listItem}
                title="Opening scheduled posts is temporarily disabled"
              >
                <span className={styles.listAvatarGroup}>
                  {postPlatforms.map((postPlatform: string) => {
                    const itemPlatform = PLATFORMS[postPlatform] || PLATFORMS.instagram;

                    return (
                      <span className={styles.listAvatarWrap} key={postPlatform}>
                        <img
                          className={styles.listAvatar}
                          src={getPostAccountAvatar(post, postPlatform as Channel)}
                          alt={`${itemPlatform.label} account`}
                          onError={(event) => {
                            event.currentTarget.src = "/profile.png";
                          }}
                        />
                        <span className={styles.listPlatformBadge} style={{ background: itemPlatform.color }}>
                          <PlatformIcon platform={postPlatform} size={12} color="#ffffff" />
                        </span>
                      </span>
                    );
                  })}
                </span>
                <span className={styles.listMain}>
                  <strong>{post.content || "Media Post"}</strong>
                  <span>
                    {date.toLocaleString()} · {postPlatforms.map((postPlatform: string) => PLATFORMS[postPlatform]?.label || postPlatform).join(", ")}
                  </span>
                </span>
                <span className={styles.listStatus}>{post.status}</span>
              </button>
            );
          })
      )}
    </div>
  );

  const renderCalendarView = () => {
    if (view === "day") return renderDayView();
    if (view === "month") return renderMonthView();
    if (view === "year") return renderYearView();
    if (view === "list") return renderListView();
    return renderWeekView();
  };

  const stats = {
    total: posts.length,
    draft: posts.filter((p: any) => p.status === "draft").length,
    scheduled: posts.filter((p: any) => p.status === "scheduled").length,
    published: posts.filter((p: any) => p.status === "published").length,
  };

  const filterOptions = [
    { key: "all", label: "All Platforms", color: "#1a1a1a" },
    ...Object.entries(PLATFORMS).map(([k, v]) => ({ key: k, label: v.label, color: v.color })),
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Social Media Content Calendar</h1>
        <button className={styles.createBtn} onClick={() => setModal({ type: "create" })}>
          <span className={styles.createBtnPlus}>+</span> Create Post
        </button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Posts</div>
          <div className={styles.statValue}>{stats.total}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Drafts</div>
          <div className={styles.statValue}>{stats.draft}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Scheduled</div>
          <div className={`${styles.statValue} ${styles.amber}`}>{stats.scheduled}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Published</div>
          <div className={`${styles.statValue} ${styles.green}`}>{stats.published}</div>
        </div>
      </div>

      <div className={styles.filterBar}>
        <span className={styles.filterLabel}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filter by:
        </span>
        {filterOptions.map((p) => {
          const isActive = activePlatform === p.key;
          return (
            <button
              key={p.key}
              className={`${styles.filterPill} ${isActive ? styles.active : ""}`}
              onClick={() => setActivePlatform(p.key)}
            >
              {p.key !== "all" && (
                <span className={styles.platformDot} style={{ background: p.color }} />
              )}
              {p.label}
            </button>
          );
        })}
      </div>

      <div className={styles.calendarCard}>
        <div className={styles.calToolbar}>
          <div className={styles.calToolbarLeft}>
            <span className={styles.monthLabel}>
              {calendarTitle.primary}{" "}
              {calendarTitle.secondary && (
                <span className={styles.monthLabelYear}>{calendarTitle.secondary}</span>
              )}
            </span>
            <div className={styles.navGroup}>
              <button className={styles.navArrow} onClick={() => setCurrentWeekOffset((o) => o - 1)}>‹</button>
              <button className={styles.todayBtn} onClick={() => setCurrentWeekOffset(0)}>Today</button>
              <button className={styles.navArrow} onClick={() => setCurrentWeekOffset((o) => o + 1)}>›</button>
            </div>
          </div>
          <div className={styles.viewToggle}>
            {["Day", "Week", "Month", "Year", "List"].map((v) => (
              <button
                key={v}
                className={`${styles.viewBtn} ${view === v.toLowerCase() ? styles.active : ""}`}
                onClick={() => setView(v.toLowerCase())}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {renderCalendarView()}
      </div>

      {modal && (
        <AdvancedScheduleModal
          post={modal.type === "edit" ? modal.post : null}
          initialDate={modal.initialDate || (modal.type === "create" ? toLocalInput(new Date().toISOString()) : null)}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          isReadOnly={modal.isReadOnly} // ✅ Pass down the freeze state
        />
      )}
    </div>
  );
};

export default Planning;
