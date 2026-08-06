import type { Channel } from '../../components/ChannelSelector';

export const CHANNEL_LABELS: Record<Channel, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  youtube: 'YouTube',
  threads: 'Threads',
};

export const MEDIA_LIMITS = {
  facebookImage: 10_000_000,
  facebookPng: 1_000_000,
  threadsImage: 8_000_000,
  threadsVideo: 1_000_000_000,
  linkedInImage: 8_000_000,
  linkedInVideoMin: 75_000,
  linkedInVideoMax: 5_000_000_000,
} as const;

export const ALLOWED_MEDIA_TYPES = {
  facebookImages: new Set(['image/jpeg', 'image/bmp', 'image/png', 'image/gif', 'image/tiff']),
  threadsImages: new Set(['image/jpeg', 'image/png']),
  threadsVideos: new Set(['video/mp4', 'video/quicktime']),
  linkedInImages: new Set(['image/jpeg', 'image/png', 'image/gif']),
  linkedInVideos: new Set(['video/mp4', 'video/webm']),
} as const;

