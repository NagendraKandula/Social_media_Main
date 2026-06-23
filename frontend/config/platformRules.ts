// frontend/config/platformRules.ts

export type Platform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "youtube"
  | "threads"
  | "pinterest"
  | "instagram_business";

export interface PlatformRule {
  text?: {
    required?: boolean;
    maxLength?: number;
  };
  media?: {
    required?: boolean;
    inputType?: "file" | "url";
    mediaTypes?: string[];
  };
  title?: boolean;            // ✅ YouTube needs this
  description?: boolean;      // ✅ ADDED THIS (Fixes your error)
  requiresPageSelection?: boolean; 
  notes?: string[];
}

export const PLATFORM_RULES: Record<Platform, PlatformRule> = {
  facebook: {
    text: { maxLength: 63206 },
    media: { inputType: "file", mediaTypes: ["image/*", "video/*"] },
    requiresPageSelection: true,
    notes: [
      "Facebook Feed supports image posts and carousel image posts.",
      "Facebook Reel supports exactly one video.",
      "Facebook Story supports exactly one image or one video.",
      "Facebook image uploads support JPEG, BMP, PNG, GIF, and TIFF.",
      "Facebook photos must be less than 10 MB.",
      "Facebook recommends PNG files stay under 1 MB or they may appear pixelated.",
    ],
  },
  instagram: {
    text: { maxLength: 2200 },
    media: { required: true, inputType: "file", mediaTypes: ["image/*", "video/*"] },
    notes: [
      "Instagram carousels support up to 10 mixed image/video items.",
      "Instagram stories support one media item per request.",
    ],
  },
  instagram_business: {
    text: { maxLength: 2200 },
    media: { required: true, inputType: "file", mediaTypes: ["image/*", "video/*"] },
    notes: [
      "Instagram carousels support up to 10 mixed image/video items.",
      "Instagram stories support one media item per request.",
    ],
  },
  linkedin: {
    text: { maxLength: 3000 },
    media: { inputType: "file", mediaTypes: ["image/*", "video/*"] },
    notes: [
      "LinkedIn supports up to 9 images or one video.",
      "LinkedIn does not support mixed image and video posts.",
      "LinkedIn images must be JPG, PNG, or static GIF and 8 MB or smaller.",
      "LinkedIn videos must be MP4 or WebM, 75 KB to 5 GB, and 3 seconds to 10 minutes.",
    ],
  },
  twitter: {
    text: { maxLength: 280 },
    media: { inputType: "file", mediaTypes: ["image/*", "video/*"] },
    notes: [
      "X supports up to 4 images or one video.",
      "X does not support mixed image and video posts.",
    ],
  },
  youtube: {
    title: true,
    description: true, // ✅ Explicitly marking description as supported
    text: { required: true, maxLength: 5000 }, 
    media: { required: true, inputType: "file", mediaTypes: ["video/*"] },
  },
  threads: {
    text: { maxLength: 500 },
    media: { inputType: "file", mediaTypes: ["image/*", "video/*"] },
    notes: [
      "Threads text is limited to 500 characters.",
      "Threads supports text only, one image, one video, or a carousel with 2 to 10 media items.",
      "Threads images must be JPEG or PNG and 8 MB or smaller.",
      "Threads videos must be MP4 or MOV and 1 GB or smaller.",
    ],
  },
  pinterest: {
    title: true,
    description: true,
    text: { maxLength: 500 },
    media: { required: true, inputType: "file", mediaTypes: ["image/*"] },
  },
};
