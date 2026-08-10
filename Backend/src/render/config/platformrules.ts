import { Platform } from '@prisma/client';
export const PLATFORM_IMAGE_RULES = {
  [Platform.INSTAGRAM]: {
    feed: {
      minAspectRatio: 4 / 5,      // 0.8
      maxAspectRatio: 1.91,
      minWidth: 320,
      maxWidth: 1440,
      maxSizeMB: 8,
      formats: ['image/jpeg'],
      recommended: {
        width: 1080,
        height: 1350,
      },
    },

    story: {
      aspectRatio: 9 / 16,
      minWidth: 500,
      maxSizeMB: 8,
      formats: ['image/jpeg'],
      recommended: {
        width: 1080,
        height: 1920,
      },
    },
  },

  [Platform.FACEBOOK]: {
    feed: {
      minAspectRatio: 4 / 5,
      maxAspectRatio: 1.91,
      minWidth: 40,
      minHeight: 40,
       maxWidth: 2048,
       maxHeight: 2048,
      maxSizeMB: 30,
      formats: ['image/jpeg', 'image/png'],
      recommended: {
        width: 1200,
        height: 630,
      },
    },

    story: {
      minAspectRatio: 4 / 5,
      maxAspectRatio: 1.91,
      minWidth: 500,
      maxSizeMB: 30,
      formats: ['image/jpeg', 'image/png'],
      recommended: {
        width: 1080,
        height: 1920,
      },
    },
  },

  [Platform.LINKEDIN]: {
    feed: {
      minAspectRatio: 1 / 2,
      maxAspectRatio: 2,
      minWidth: 552,
      maxSizeMB: 20,
      formats: ['image/jpeg', 'image/png'],
      recommended: {
        width: 1200,
        height: 627,
      },
    },
  },

  [Platform.THREADS]: {
    feed: {
      minAspectRatio: 0.01,
      maxAspectRatio: 10,
      minWidth: 320,
      maxWidth: 1440,
      maxSizeMB: 8,
      formats: ['image/jpeg', 'image/png'],
      recommended: {
        width: 1080,
        height: 1080,
      },
    },
  },
};