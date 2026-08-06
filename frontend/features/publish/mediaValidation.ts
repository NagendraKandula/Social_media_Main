import type { Channel } from '../../components/ChannelSelector';
import type { PlatformState } from '../../components/PlatformFields';
import { validateInstagramMediaSpecs } from '../../utils/instagramMediaSpecs';
import { ALLOWED_MEDIA_TYPES, MEDIA_LIMITS } from './constants';

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
    (width >= 1080 && height >= 1350 && isNearRatio(ratio, 4 / 5, 0.08)) ||
    (width >= 1080 && height >= 1920 && isNearRatio(ratio, 9 / 16, 0.08))
  );
};

export const getDisabledChannels = (files: File[], platformState: PlatformState) => {
  const disabled = new Set<Channel>();
  const imageCount = files.filter((file) => file.type.startsWith('image/')).length;
  const videoCount = files.filter((file) => file.type.startsWith('video/')).length;
  const hasImages = imageCount > 0;
  const hasVideos = videoCount > 0;
  const hasMixedMedia = hasImages && hasVideos;
  const totalItems = files.length;

  if (totalItems === 0) return disabled;
  if ((platformState.instagramPostType === 'story' && totalItems > 1) || totalItems > 10) disabled.add('instagram');
  if (totalItems > 10) disabled.add('threads');
  if (hasMixedMedia || videoCount > 1 || imageCount > 4) disabled.add('twitter');
  if (hasMixedMedia || videoCount > 1 || imageCount > 9) disabled.add('linkedin');

  if (platformState.facebookPostType === 'reel') {
    if (hasImages || videoCount > 1 || totalItems > 1) disabled.add('facebook');
  } else if (platformState.facebookPostType === 'story') {
    if (totalItems > 1) disabled.add('facebook');
  } else if (hasVideos || hasMixedMedia) {
    disabled.add('facebook');
  }

  if (hasImages || videoCount > 1 || totalItems > 1) disabled.add('youtube');
  return disabled;
};

export const getInstagramValidationErrors = (
  files: File[],
  selectedChannels: Set<Channel>,
  platformState: PlatformState
) => {
  if (!selectedChannels.has('instagram') || files.length === 0) return Promise.resolve([]);
  return validateInstagramMediaSpecs(files, platformState.instagramPostType || 'post');
};

export const getFacebookValidationErrors = (
  files: File[],
  selectedChannels: Set<Channel>,
  platformState: PlatformState
) => {
  if (!selectedChannels.has('facebook')) return [];

  const imageCount = files.filter((file) => file.type.startsWith('image/')).length;
  const videoCount = files.filter((file) => file.type.startsWith('video/')).length;
  const totalItems = files.length;
  const postType = platformState.facebookPostType || 'feed';
  const unsupportedImages = files.filter((file) => file.type.startsWith('image/') && !ALLOWED_MEDIA_TYPES.facebookImages.has(file.type));
  const oversizedImages = files.filter((file) => file.type.startsWith('image/') && file.size > MEDIA_LIMITS.facebookImage);
  const oversizedPngImages = files.filter((file) => file.type === 'image/png' && file.size > MEDIA_LIMITS.facebookPng);

  if (unsupportedImages.length > 0) {
    return unsupportedImages.map((file) => `${file.name} uses an unsupported Facebook image type. Use JPEG, BMP, PNG, GIF, or TIFF.`);
  }
  if (oversizedImages.length > 0) {
    return oversizedImages.map((file) => `${file.name} is too large. Facebook photos must be less than 10 MB, so this post cannot be published until you compress or replace it.`);
  }
  if (oversizedPngImages.length > 0) {
    return oversizedPngImages.map((file) => `${file.name} is a PNG larger than 1 MB. Facebook recommends PNG files stay under 1 MB or the image may appear pixelated, so this post cannot be published until you compress or replace it.`);
  }
  if (postType === 'feed' && videoCount > 0) {
    return ['Facebook Feed supports image posts and carousel image posts only. Remove videos or choose Reel/Story.'];
  }
  if (postType === 'reel' && (totalItems !== 1 || videoCount !== 1)) {
    return ['Facebook Reel requires exactly one video. Remove images and extra videos.'];
  }
  if (postType === 'story' && (totalItems !== 1 || (imageCount !== 1 && videoCount !== 1))) {
    return ['Facebook Story requires exactly one image or one video.'];
  }
  return [];
};

export const validateFilesForSelectedChannels = async (
  nextFiles: File[],
  selectedChannels: Set<Channel>,
  platformState: PlatformState
) => {
  const errors: string[] = [];
  const imageCount = nextFiles.filter((file) => file.type.startsWith('image/')).length;
  const videoCount = nextFiles.filter((file) => file.type.startsWith('video/')).length;
  const hasImages = imageCount > 0;
  const hasVideos = videoCount > 0;
  const totalItems = nextFiles.length;

  nextFiles.forEach((file) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) errors.push(`${file.name} is not supported. Upload an image or video file.`);
  });

  if (selectedChannels.has('facebook')) {
    nextFiles.filter((file) => file.type.startsWith('image/') && !ALLOWED_MEDIA_TYPES.facebookImages.has(file.type))
      .forEach((file) => errors.push(`${file.name} cannot be uploaded to Facebook. Use JPEG, BMP, PNG, GIF, or TIFF.`));
    nextFiles.filter((file) => file.type.startsWith('image/') && file.size > MEDIA_LIMITS.facebookImage)
      .forEach((file) => errors.push(`${file.name} cannot be uploaded to Facebook because photos must be less than 10 MB.`));
    nextFiles.filter((file) => file.type === 'image/png' && file.size > MEDIA_LIMITS.facebookPng)
      .forEach((file) => errors.push(`${file.name} cannot be uploaded to Facebook because PNG files should stay under 1 MB to avoid pixelation.`));

    const postType = platformState.facebookPostType || 'feed';
    if (postType === 'feed' && hasVideos) errors.push('Facebook Feed supports images only. Switch Facebook to Reel or Story before uploading a video.');
    if (postType === 'reel' && (totalItems !== 1 || videoCount !== 1)) errors.push('Facebook Reel requires exactly one video.');
    if (postType === 'story' && (totalItems !== 1 || (imageCount !== 1 && videoCount !== 1))) errors.push('Facebook Story requires exactly one image or one video.');
  }

  if (selectedChannels.has('instagram')) {
    if (platformState.instagramPostType === 'reel') {
      if (hasImages) errors.push('Instagram Reels do not allow photos. Reels must be created from one video because Instagram publishes Reels as short-form video content.');
      if (videoCount > 1 || totalItems > 1) errors.push('Instagram Reels allow only one video. Remove extra media or switch Instagram to Post for carousel publishing.');
    } else if (platformState.instagramPostType === 'story' && totalItems > 1) {
      errors.push('Instagram Story allows only one media file.');
    } else if (platformState.instagramPostType === 'post') {
      if (hasVideos) errors.push('Instagram Post allows images only. Upload one image for a feed post or multiple images for a carousel.');
      if (totalItems > 10) errors.push('Instagram carousel allows a maximum of 10 media files.');
    }
  }

  if (selectedChannels.has('threads')) {
    nextFiles.forEach((file) => {
      if (file.type.startsWith('image/')) {
        if (!ALLOWED_MEDIA_TYPES.threadsImages.has(file.type)) errors.push(`${file.name} cannot be uploaded to Threads. Use JPEG or PNG images.`);
        if (file.size > MEDIA_LIMITS.threadsImage) errors.push(`${file.name} cannot be uploaded to Threads because images must be 8 MB or smaller.`);
      }
      if (file.type.startsWith('video/')) {
        if (!ALLOWED_MEDIA_TYPES.threadsVideos.has(file.type)) errors.push(`${file.name} cannot be uploaded to Threads. Use MP4 or MOV videos.`);
        if (file.size > MEDIA_LIMITS.threadsVideo) errors.push(`${file.name} cannot be uploaded to Threads because videos must be 1 GB or smaller.`);
      }
    });
    if (totalItems > 10) errors.push('Threads carousel allows a maximum of 10 media files.');
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
        if (!ALLOWED_MEDIA_TYPES.linkedInImages.has(file.type)) errors.push(`${file.name} cannot be uploaded to LinkedIn. Use JPG, PNG, or static GIF images.`);
        if (file.size > MEDIA_LIMITS.linkedInImage) errors.push(`${file.name} cannot be uploaded to LinkedIn because images must be 8 MB or smaller.`);
        try {
          if (!matchesLinkedInRecommendedImageDimensions(await getImageDimensions(file))) errors.push(`${file.name} does not match LinkedIn recommended dimensions. Use square 1080x1080 or 1200x1200, landscape 1200x627, or portrait 4:5 / 9:16.`);
        } catch {
          errors.push(`Could not read dimensions for ${file.name}.`);
        }
      }
      if (file.type.startsWith('video/')) {
        if (!ALLOWED_MEDIA_TYPES.linkedInVideos.has(file.type)) errors.push(`${file.name} cannot be uploaded to LinkedIn. Use MP4 or WebM video.`);
        if (file.size < MEDIA_LIMITS.linkedInVideoMin || file.size > MEDIA_LIMITS.linkedInVideoMax) errors.push(`${file.name} cannot be uploaded to LinkedIn because videos must be between 75 KB and 5 GB.`);
        try {
          const { width, height, duration } = await getVideoDimensions(file);
          const ratio = width / height;
          if (duration < 3 || duration > 600) errors.push(`${file.name} must be between 3 seconds and 10 minutes for LinkedIn.`);
          if (width < 256 || height < 144 || width > 4096 || height > 2304) errors.push(`${file.name} must have a resolution between 256x144 and 4096x2304 for LinkedIn.`);
          if (ratio < 1 / 2.4 || ratio > 2.4) errors.push(`${file.name} must use a LinkedIn-supported aspect ratio between 1:2.4 and 2.4:1.`);
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
