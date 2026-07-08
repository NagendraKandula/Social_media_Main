import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ChevronLeft, Eye, RefreshCw, Sparkles } from 'lucide-react';
import styles from '../../../styles/LandingCSS/Tabs/Publish.module.css';

import ChannelSelector, { Channel } from '../../../components/ChannelSelector';
import { AiAnalysisResult, PlatformRecommendation } from '../../../types';
import { PlatformState } from '../../../components/PlatformFields';

import { usePostCreation } from '../../../hooks/usePostCreation';
import apiClient from '../../../lib/axios';
import { validateInstagramMediaSpecs } from '../../../utils/instagramMediaSpecs';
import { resolveEditorRules } from '../../../utils/resolveEditorRules';
import { addNotification } from '../../../utils/notifications';
import { useAppDispatch } from '../../../store/hooks';
import { DASHBOARD_TABS, setActiveTab } from '../../../store/dashboardSlice';

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
const CHANNEL_LABELS: Record<Channel, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  youtube: 'YouTube',
  threads: 'Threads',
};

/* ===============================
   Types
================================ */

interface FacebookPage {
  id: string;
  name: string;
  pictureUrl?: string | null;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

interface SocialAccount {
  name: string;
  profilePic?: string;
  needsReconnect?: boolean;
}

/* ===============================
   Component
================================ */

export default function Publish() {
  const dispatch = useAppDispatch();
  /* ===============================
     Core State
  ================================ */

  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(new Set());

  const [activeSidePanel, setActiveSidePanel] = useState<'ai' | 'preview' | null>('ai');
  const [aiRecommendations, setAiRecommendations] = useState<PlatformRecommendation[]>([]);
  const [aiEngagement, setAiEngagement] = useState<string | null>(null);
  const [aiResultControls, setAiResultControls] = useState<{
    onBack: () => void;
    onRegenerate: () => void;
  } | null>(null);
  const engagementTone = (value?: string | null) => {
    const normalized = value?.toLowerCase();

    if (normalized === 'high') return 'Strong';
    if (normalized === 'low') return 'Needs Attention';
    return 'Steady';
  };
  const handleAnalysisComplete = (result: AiAnalysisResult) => {
    setAiRecommendations(result.analysis?.recommendedPlatforms || []);
    setAiEngagement(result.analysis?.engagementPrediction || null);
  };
  const handleAnalysisReset = () => {
    setAiRecommendations([]);
    setAiEngagement(null);
    setAiResultControls(null);
  };
  const handleApplyCaption = (aiCaption: string) => {
    // We use <br/><br/> instead of \n\n because the ContentEditor uses HTML
    setContent((prev) => (prev ? `${prev}<br/><br/>${aiCaption}` : aiCaption));
  };

  const handleApplyHashtags = (aiHashtags: string[]) => {
    const tagsString = aiHashtags.join(' ');
    setContent((prev) => (prev ? `${prev}<br/><br/>${tagsString}` : tagsString));
  };

  const handleAutoSelectPlatforms = (platforms: PlatformRecommendation[]) => {
    const next = new Set(selectedChannels);
    platforms.forEach((p) => {
      // Auto-select if the AI gave it 4 or 5 stars
      if (p.rating >= 4) {
        next.add(p.platform.toLowerCase() as Channel);
      }
    });
    setSelectedChannels(next);
  };
  const [platformState, setPlatformState] = useState<PlatformState>({
    facebookPostType: 'feed',
    instagramPostType: 'post',
    youtubeType: 'video',
  });

  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [accounts, setAccounts] = useState<Partial<Record<Channel, SocialAccount>>>({});

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewMode, setReviewMode] = useState<'publish' | 'schedule'>('publish');
  const [scheduleDate, setScheduleDate] = useState('');

  const { uploadMultipleMedia, createPost, uploading, publishing } = usePostCreation();
  /* ===============================
     Derived Data
  ================================ */

  const selectedChannelList = useMemo(
    () => Array.from(selectedChannels),
    [selectedChannels]
  );

  const selectedFacebookPage = useMemo(
    () =>
      facebookPages.find(
        (page) => page.id === platformState.facebookPageId
      ),
    [facebookPages, platformState.facebookPageId]
  );

  const getChannelDetail = (channel: Channel) => {
    if (channel === 'facebook') {
      const pageName =
        selectedFacebookPage?.name ||
        facebookPages.find((page) => page.id === platformState.facebookPageId)?.name ||
        'Selected page';
      const postType = platformState.facebookPostType || 'feed';

      return `Facebook - Page: ${pageName}, Type: ${postType}`;
    }

    if (channel === 'instagram') {
      return `Instagram - Type: ${platformState.instagramPostType || 'post'}`;
    }

    if (channel === 'youtube') {
      const title = platformState.youtubeTitle?.trim();
      return `YouTube - Type: ${platformState.youtubeType || 'video'}${title ? `, Title: ${title}` : ''}`;
    }

    return CHANNEL_LABELS[channel] || channel;
  };

  const selectedChannelDetails = useMemo(
    () => selectedChannelList.map((channel) => getChannelDetail(channel)),
    [
      selectedChannelList,
      selectedFacebookPage,
      facebookPages,
      platformState.facebookPageId,
      platformState.facebookPostType,
      platformState.instagramPostType,
      platformState.youtubeTitle,
      platformState.youtubeType,
    ]
  );

  const getNotificationSnippet = () => {
    const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plainText) return plainText.length > 72 ? `${plainText.slice(0, 72)}...` : plainText;
    return files.length > 0 ? `Media post with ${files.length} file${files.length === 1 ? '' : 's'}` : 'Untitled post';
  };

  const totalMediaSize = useMemo(
    () => files.reduce((total, file) => total + file.size, 0),
    [files]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 MB';

    const units = ['B', 'KB', 'MB', 'GB'];
    const unitIndex = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );
    const value = bytes / 1024 ** unitIndex;

    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const effectiveRules = useMemo(
    () => resolveEditorRules(selectedChannelList),
    [selectedChannelList]
  );

  const disabledChannels = useMemo(() => {
    const disabled = new Set<Channel>();

    const imageCount = files.filter((file) => file.type.startsWith('image/')).length;
    const videoCount = files.filter((file) => file.type.startsWith('video/')).length;
    const hasImages = imageCount > 0;
    const hasVideos = videoCount > 0;
    const hasMixedMedia = hasImages && hasVideos;
    const totalItems = files.length;
    const isInstagramStory = platformState.instagramPostType === 'story';

    if (totalItems === 0) {
      return disabled;
    }

    if (isInstagramStory && totalItems > 1) {
      disabled.add('instagram');
    } else if (totalItems > 10) {
      disabled.add('instagram');
    }

    if (totalItems > 10) {
      disabled.add('threads');
    }

    if (hasMixedMedia || videoCount > 1 || imageCount > 4) {
      disabled.add('twitter');
    }

    if (hasMixedMedia || videoCount > 1 || (hasVideos && imageCount > 0) || imageCount > 9) {
      disabled.add('linkedin');
    }

    if (platformState.facebookPostType === 'reel') {
      if (hasImages || videoCount > 1 || totalItems > 1) {
        disabled.add('facebook');
      }
    } else if (platformState.facebookPostType === 'story') {
      if (totalItems > 1) {
        disabled.add('facebook');
      }
    } else if (hasVideos || hasMixedMedia) {
      disabled.add('facebook');
    }

    if (hasImages || videoCount > 1 || totalItems > 1) {
      disabled.add('youtube');
    }

    return disabled;
  }, [files, platformState.facebookPostType, platformState.instagramPostType]);

  useEffect(() => {
    let changed = false;
    const nextChannels = new Set(selectedChannels);

    disabledChannels.forEach((channel) => {
      if (nextChannels.has(channel)) {
        nextChannels.delete(channel);
        changed = true;
      }
    });

    if (changed) {
      setSelectedChannels(nextChannels);
      alert('Some selected channels were removed because the current media does not match their publishing limits.');
    }
  }, [files, selectedChannels, disabledChannels]);

  const getInstagramValidationErrors = async () => {
    if (!selectedChannels.has('instagram') || files.length === 0) {
      return [];
    }

    return validateInstagramMediaSpecs(
      files,
      platformState.instagramPostType || 'post'
    );
  };

  const alertInstagramValidationErrors = (errors: string[]) => {
    alert(`Instagram media does not match the required specs:\n\n${errors.join('\n')}`);
  };

  const getFacebookValidationErrors = () => {
    if (!selectedChannels.has('facebook')) {
      return [];
    }

    const imageCount = files.filter((file) => file.type.startsWith('image/')).length;
    const videoCount = files.filter((file) => file.type.startsWith('video/')).length;
    const totalItems = files.length;
    const postType = platformState.facebookPostType || 'feed';
    const unsupportedImages = files.filter(
      (file) =>
        file.type.startsWith('image/') &&
        !FACEBOOK_ALLOWED_IMAGE_TYPES.has(file.type)
    );
    const oversizedImages = files.filter(
      (file) =>
        file.type.startsWith('image/') &&
        file.size > FACEBOOK_MAX_IMAGE_SIZE_BYTES
    );
    const oversizedPngImages = files.filter(
      (file) =>
        file.type === 'image/png' &&
        file.size > FACEBOOK_RECOMMENDED_PNG_SIZE_BYTES
    );

    if (unsupportedImages.length > 0) {
      return unsupportedImages.map(
        (file) =>
          `${file.name} uses an unsupported Facebook image type. Use JPEG, BMP, PNG, GIF, or TIFF.`
      );
    }

    if (oversizedImages.length > 0) {
      return oversizedImages.map(
        (file) =>
          `${file.name} is too large. Facebook photos must be less than 10 MB, so this post cannot be published until you compress or replace it.`
      );
    }

    if (oversizedPngImages.length > 0) {
      return oversizedPngImages.map(
        (file) =>
          `${file.name} is a PNG larger than 1 MB. Facebook recommends PNG files stay under 1 MB or the image may appear pixelated, so this post cannot be published until you compress or replace it.`
      );
    }

    if (postType === 'feed') {
      if (videoCount > 0) {
        return ['Facebook Feed supports image posts and carousel image posts only. Remove videos or choose Reel/Story.'];
      }

      return [];
    }

    if (postType === 'reel') {
      if (totalItems !== 1 || videoCount !== 1) {
        return ['Facebook Reel requires exactly one video. Remove images and extra videos.'];
      }

      return [];
    }

    if (postType === 'story') {
      if (totalItems !== 1 || (imageCount !== 1 && videoCount !== 1)) {
        return ['Facebook Story requires exactly one image or one video.'];
      }
    }

    return [];
  };

  const alertFacebookValidationErrors = (errors: string[]) => {
    alert(`Facebook media does not match the selected post type:\n\n${errors.join('\n')}`);
  };

  const waitForPostCompletion = async (postId: number) => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 2500));

      const { data } = await apiClient.get(`/posting/${postId}/status`);
      const platformStatuses = data.platforms || [];
      const failedPlatforms = platformStatuses.filter((item: any) => item.status === 'FAILED');
      const pendingPlatforms = platformStatuses.filter((item: any) =>
        ['PENDING', 'PUBLISHING'].includes(item.status)
      );

      if (failedPlatforms.length > 0) {
        return {
          status: 'FAILED',
          platforms: failedPlatforms,
        };
      }

      if (pendingPlatforms.length === 0 && platformStatuses.length > 0) {
        return {
          status: 'PUBLISHED',
          platforms: platformStatuses,
        };
      }
    }

    return { status: 'PENDING', platforms: [] };
  };

  const validateFilesForSelectedChannels = async (nextFiles: File[]) => {
    const errors: string[] = [];
    const imageCount = nextFiles.filter((file) => file.type.startsWith('image/')).length;
    const videoCount = nextFiles.filter((file) => file.type.startsWith('video/')).length;
    const hasImages = imageCount > 0;
    const hasVideos = videoCount > 0;
    const totalItems = nextFiles.length;

    nextFiles.forEach((file) => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        errors.push(`${file.name} is not supported. Upload an image or video file.`);
      }
    });

    if (selectedChannels.has('facebook')) {
      const unsupportedImages = nextFiles.filter(
        (file) =>
          file.type.startsWith('image/') &&
          !FACEBOOK_ALLOWED_IMAGE_TYPES.has(file.type)
      );
      const oversizedImages = nextFiles.filter(
        (file) =>
          file.type.startsWith('image/') &&
          file.size > FACEBOOK_MAX_IMAGE_SIZE_BYTES
      );
      const oversizedPngImages = nextFiles.filter(
        (file) =>
          file.type === 'image/png' &&
          file.size > FACEBOOK_RECOMMENDED_PNG_SIZE_BYTES
      );

      unsupportedImages.forEach((file) => {
        errors.push(`${file.name} cannot be uploaded to Facebook. Use JPEG, BMP, PNG, GIF, or TIFF.`);
      });

      oversizedImages.forEach((file) => {
        errors.push(`${file.name} cannot be uploaded to Facebook because photos must be less than 10 MB.`);
      });

      oversizedPngImages.forEach((file) => {
        errors.push(`${file.name} cannot be uploaded to Facebook because PNG files should stay under 1 MB to avoid pixelation.`);
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
        if (file.type.startsWith('image/')) {
          if (!THREADS_ALLOWED_IMAGE_TYPES.has(file.type)) {
            errors.push(`${file.name} cannot be uploaded to Threads. Use JPEG or PNG images.`);
          }
          if (file.size > THREADS_MAX_IMAGE_SIZE_BYTES) {
            errors.push(`${file.name} cannot be uploaded to Threads because images must be 8 MB or smaller.`);
          }
        }
        if (file.type.startsWith('video/')) {
          if (!THREADS_ALLOWED_VIDEO_TYPES.has(file.type)) {
            errors.push(`${file.name} cannot be uploaded to Threads. Use MP4 or MOV videos.`);
          }
          if (file.size > THREADS_MAX_VIDEO_SIZE_BYTES) {
            errors.push(`${file.name} cannot be uploaded to Threads because videos must be 1 GB or smaller.`);
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
        if (file.type.startsWith('image/')) {
          if (!LINKEDIN_ALLOWED_IMAGE_TYPES.has(file.type)) {
            errors.push(`${file.name} cannot be uploaded to LinkedIn. Use JPG, PNG, or static GIF images.`);
          }
          if (file.size > LINKEDIN_MAX_IMAGE_SIZE_BYTES) {
            errors.push(`${file.name} cannot be uploaded to LinkedIn because images must be 8 MB or smaller.`);
          }

          try {
            const dimensions = await getImageDimensions(file);
            if (!matchesLinkedInRecommendedImageDimensions(dimensions)) {
              errors.push(
                `${file.name} does not match LinkedIn recommended dimensions. Use square 1080x1080 or 1200x1200, landscape 1200x627, or portrait 4:5 / 9:16.`
              );
            }
          } catch {
            errors.push(`Could not read dimensions for ${file.name}.`);
          }
        }

        if (file.type.startsWith('video/')) {
          if (!LINKEDIN_ALLOWED_VIDEO_TYPES.has(file.type)) {
            errors.push(`${file.name} cannot be uploaded to LinkedIn. Use MP4 or WebM video.`);
          }
          if (file.size < LINKEDIN_MIN_VIDEO_SIZE_BYTES || file.size > LINKEDIN_MAX_VIDEO_SIZE_BYTES) {
            errors.push(`${file.name} cannot be uploaded to LinkedIn because videos must be between 75 KB and 5 GB.`);
          }

          try {
            const { width, height, duration } = await getVideoDimensions(file);
            const ratio = width / height;
            if (duration < 3 || duration > 600) {
              errors.push(`${file.name} must be between 3 seconds and 10 minutes for LinkedIn.`);
            }
            if (width < 256 || height < 144 || width > 4096 || height > 2304) {
              errors.push(`${file.name} must have a resolution between 256x144 and 4096x2304 for LinkedIn.`);
            }
            if (ratio < 1 / 2.4 || ratio > 2.4) {
              errors.push(`${file.name} must use a LinkedIn-supported aspect ratio between 1:2.4 and 2.4:1.`);
            }
          } catch {
            errors.push(`Could not read video metadata for ${file.name}.`);
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

  /* ===============================
     Fetch Connected Accounts
  ================================ */

  useEffect(() => {
    apiClient
      .get('/auth/social/active-accounts')
      .then((res) => setAccounts(res.data))
      .catch((err) =>
        console.error('Failed to fetch connected accounts', err)
      );
  }, []);

  /* ===============================
     Facebook Pages
  ================================ */

  useEffect(() => {
    if (!accounts.facebook) return;

    apiClient
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
      .catch((err) => console.error('FB Pages Error:', err));
  }, [accounts.facebook, platformState.facebookPageId]);

  /* ===============================
     Submit
  ================================ */

const handleSubmit = async (isScheduled: boolean) => {
    if (selectedChannels.size === 0) {
      alert('Select at least one channel.');
      return;
    }

    if (!content && files.length === 0) {
      alert('Add content or media.');
      return;
    }

    try {
      const instagramErrors = await getInstagramValidationErrors();
      if (instagramErrors.length > 0) {
        alertInstagramValidationErrors(instagramErrors);
        return;
      }

      const facebookErrors = getFacebookValidationErrors();
      if (facebookErrors.length > 0) {
        alertFacebookValidationErrors(facebookErrors);
        return;
      }

      // ✅ 1. Use YOUR existing hook to upload all files at once!
      let uploadedMediaItems: any[] = [];

      if (files.length > 0) {
        const uploadResults = await uploadMultipleMedia(files);
        
        // Format the results to match your new backend DTO
        uploadedMediaItems = uploadResults.map((result: any, index: number) => ({
          mediaUrl: result.publicUrl,
          storagePath: result.storagePath,
          mimeType: files[index].type,
          mediaType: files[index].type.startsWith('video') ? 'VIDEO' : 'IMAGE',
          size: files[index].size,
        }));
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
        platformOverrides.youtube = { title: platformState.youtubeTitle, postType: platformState.youtubeType };
      }

      // ✅ 2. Send the 'mediaItems' array to the backend
      const payload = {
        content,
        mediaItems: uploadedMediaItems, 
        platforms: selectedChannelList,
        scheduledAt: isScheduled ? new Date(scheduleDate).toISOString() : null,
        contentMetadata: {
          text: content,
          platformOverrides,
        },
      };

      const createdPost = await createPost(payload);

      const channelText = selectedChannelDetails.join(' | ');
      const eventTime = isScheduled
        ? new Date(scheduleDate).toLocaleString()
        : new Date().toLocaleString();

      addNotification({
        type: 'success',
        title: isScheduled ? 'Post scheduled' : 'Post submitted',
        message: getNotificationSnippet(),
        details: [
          ...(createdPost?.id ? [{ label: 'Post ID', value: String(createdPost.id) }] : []),
          { label: 'Channels', value: channelText },
          { label: 'Media', value: `${files.length} file${files.length === 1 ? '' : 's'}` },
          { label: isScheduled ? 'Scheduled' : 'Submitted', value: eventTime },
        ],
      });

      if (!isScheduled && createdPost?.id) {
        waitForPostCompletion(createdPost.id)
          .then((result) => {
            if (result.status === 'PUBLISHED') {
              addNotification({
                type: 'success',
                title: 'Post published',
                message: getNotificationSnippet(),
                details: [
                  { label: 'Post ID', value: String(createdPost.id) },
                  { label: 'Channels', value: channelText },
                  { label: 'Media', value: `${files.length} file${files.length === 1 ? '' : 's'}` },
                  { label: 'Published', value: new Date().toLocaleString() },
                ],
                dedupeKey: `published-now-${createdPost.id}`,
              });
            }

            if (result.status === 'FAILED') {
              const failedChannels = result.platforms
                .map((item: any) => getChannelDetail(item.platform as Channel))
                .join(' | ');
              const errorText = result.platforms
                .map((item: any) => item.errorMessage)
                .filter(Boolean)
                .join(' ');

              addNotification({
                type: 'error',
                title: 'Post failed',
                message: getNotificationSnippet(),
                details: [
                  { label: 'Post ID', value: String(createdPost.id) },
                  { label: 'Channels', value: failedChannels },
                  { label: 'Reason', value: errorText || 'Please review the post and try again.' },
                ],
              });
            }
          })
          .catch((error) => {
            console.error('Failed to check post status:', error);
          });
      }

      alert(isScheduled ? 'Post scheduled successfully' : 'Post submitted for publishing');

      setContent('');
      setFiles([]);
      setSelectedChannels(new Set());
      setScheduleDate('');
      setShowScheduleModal(false);
      setShowReviewModal(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to create post');
    }
  };

  const openReview = async (mode: 'publish' | 'schedule') => {
    if (selectedChannels.size === 0) {
      alert('Select at least one channel.');
      return;
    }

    if (!content && files.length === 0) {
      alert('Add content or media.');
      return;
    }

    if (mode === 'schedule' && !scheduleDate) {
      alert('Pick a schedule date and time.');
      return;
    }

    const instagramErrors = await getInstagramValidationErrors();
    if (instagramErrors.length > 0) {
      alertInstagramValidationErrors(instagramErrors);
      return;
    }

    const facebookErrors = getFacebookValidationErrors();
    if (facebookErrors.length > 0) {
      alertFacebookValidationErrors(facebookErrors);
      return;
    }

    setReviewMode(mode);
    setShowScheduleModal(false);
    setShowReviewModal(true);
  };

  /* ===============================
     UI
  ================================ */

  return (
    <div className={styles.publishPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Publish</h1>
          <p>Create once, tailor by platform, and publish when it is ready.</p>
        </div>

      </div>

      <div className={`${styles.mainLayout} ${!activeSidePanel ? styles.previewHidden : ''}`}>
        <div className={styles.topRow}>
          <ChannelSelector
            accounts={accounts}
            selectedChannels={selectedChannels}
            onSelectionChange={setSelectedChannels}
            disabledChannels={disabledChannels}
            facebookPages={facebookPages}
            selectedFacebookPageId={platformState.facebookPageId}
            onFacebookPageSelect={(pageId) =>
              setPlatformState((prev) => ({ ...prev, facebookPageId: pageId }))
            }
            onAddChannel={() => dispatch(setActiveTab(DASHBOARD_TABS.ACTIVE))}
          />

          <div className={styles.topActions}>
            <button
              type="button"
              className={`${styles.headerToolBtn} ${activeSidePanel === 'ai' ? styles.headerToolActive : ''}`}
              onClick={() => setActiveSidePanel((panel) => panel === 'ai' ? null : 'ai')}
              aria-pressed={activeSidePanel === 'ai'}
            >
              <Sparkles size={15} aria-hidden="true" />
              AI Assistant
            </button>
            <button
              type="button"
              className={`${styles.headerToolBtn} ${activeSidePanel === 'preview' ? styles.headerToolActive : ''}`}
              onClick={() => setActiveSidePanel((panel) => panel === 'preview' ? null : 'preview')}
              aria-pressed={activeSidePanel === 'preview'}
            >
              <Eye size={15} aria-hidden="true" />
              Preview
            </button>
            <button
              className={styles.secondaryBtn}
              onClick={() => setShowScheduleModal(true)}
            >
              Schedule
            </button>
            <button
              className={styles.primaryBtn}
              onClick={() => openReview('publish')}
              disabled={uploading || publishing}
            >
              {uploading || publishing ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>

        <section className={styles.composerPane} aria-label="Post composer">
          <LazyContentEditor
            content={content}
            onContentChange={setContent}
            files={files}
            onFilesChange={setFiles}
            effectiveRules={effectiveRules}
            validation={{}}
            selectedChannels={selectedChannelList}
            validateFilesForSelectedChannels={validateFilesForSelectedChannels}
            size="publish"
            aiRecommendations={aiRecommendations}
          />

          <LazyPlatformFields
            selectedChannels={selectedChannels}
            platformState={platformState}
            setPlatformState={setPlatformState}
            facebookPages={facebookPages}
          />
        </section>

        {activeSidePanel && <aside className={`${styles.previewPane} ${activeSidePanel === 'ai' ? styles.aiPane : ''}`} aria-label={activeSidePanel === 'preview' ? 'Post preview' : 'AI Assistant'}>
          <div className={`${styles.rightHeader} ${activeSidePanel === 'ai' ? styles.aiRightHeader : ''}`}>
            <div className={styles.rightHeaderTitleGroup}>
              {activeSidePanel === 'ai' && aiResultControls && (
                <button
                  type="button"
                  className={styles.aiHeaderIconBtn}
                  onClick={aiResultControls.onBack}
                  aria-label="Back to AI analysis start"
                  title="Back"
                >
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
              )}
              {activeSidePanel === 'preview' && <span>Live preview</span>}
              <h2>{activeSidePanel === 'preview' ? 'Post Preview' : 'AI Assistant'}</h2>
            </div>
            <div className={styles.rightHeaderActionGroup}>
              {activeSidePanel === 'ai' && aiResultControls && (
                <button
                  type="button"
                  className={styles.aiRegenerateBtn}
                  onClick={aiResultControls.onRegenerate}
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  Regenerate
                </button>
              )}
              {activeSidePanel === 'ai' && aiEngagement && (
                <span className={styles.aiEngagementBadge}>
                  {engagementTone(aiEngagement)}
                </span>
              )}
            </div>
          </div>

          <div className={styles.rightPanel}>
            {activeSidePanel === 'preview' ? (
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
            ) : (
              <LazyAIAssistant
                files={files}
                content={content}
                onAnalysisComplete={handleAnalysisComplete}
                onAnalysisReset={handleAnalysisReset}
                onResultControlsChange={setAiResultControls}
                onApplyCaption={handleApplyCaption}
                onApplyHashtags={handleApplyHashtags}
                onAutoSelectPlatforms={handleAutoSelectPlatforms}
              />
            )}
          </div>
        </aside>}
      </div>


      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className={styles.scheduleOverlay}>
          <div className={styles.scheduleModal}>
            <h3>Pick a Date & Time</h3>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button onClick={() => setShowScheduleModal(false)}>
                Cancel
              </button>
              <button onClick={() => openReview('schedule')}>
                Review
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className={styles.reviewOverlay}>
          <div className={styles.reviewModal}>
            <div className={styles.reviewHeader}>
              <div>
                <h3>Review post</h3>
                <p>
                  {reviewMode === 'schedule'
                    ? `Scheduled for ${new Date(scheduleDate).toLocaleString()}`
                    : 'Ready to publish now'}
                </p>
              </div>

              <button
                type="button"
                className={styles.closeReviewBtn}
                onClick={() => setShowReviewModal(false)}
                aria-label="Close review"
              >
                ×
              </button>
            </div>

            <div className={styles.reviewBody}>
              <section className={styles.reviewSummary}>
                <div>
                  <span className={styles.reviewLabel}>Channels</span>
                  <div className={styles.channelPills}>
                    {selectedChannelList.map((channel) => (
                      <span key={channel}>{CHANNEL_LABELS[channel] || channel}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className={styles.reviewLabel}>Media</span>
                  {files.length > 0 ? (
                    <div className={styles.mediaSummary}>
                      <p>{files.length} file{files.length === 1 ? '' : 's'} attached</p>
                      <p>Total size: {formatFileSize(totalMediaSize)}</p>
                    </div>
                  ) : (
                    <p>No media attached</p>
                  )}
                </div>

                <div>
                  <span className={styles.reviewLabel}>Caption</span>
                  <p className={styles.captionPreview}>{content || 'No caption added.'}</p>
                </div>
              </section>

              <section className={styles.reviewPreview}>
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
              </section>
            </div>

            <div className={styles.reviewActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setShowReviewModal(false)}
              >
                Back to edit
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => handleSubmit(reviewMode === 'schedule')}
                disabled={uploading || publishing}
              >
                {uploading || publishing
                  ? 'Sending...'
                  : reviewMode === 'schedule'
                    ? 'Confirm schedule'
                    : 'Confirm publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
