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
      "Facebook Feed supports multiple images or one video.",
      "Facebook does not support mixed image and video posts.",
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
      "Threads supports up to 10 mixed image/video items.",
    ],
  },
  pinterest: {
    title: true,
    description: true,
    text: { maxLength: 500 },
    media: { required: true, inputType: "file", mediaTypes: ["image/*"] },
  },
};
