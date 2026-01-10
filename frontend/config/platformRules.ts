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
    maxLength?: number; // Character limit
  };
  media?: {
    required?: boolean;
    inputType?: "file" | "url"; // Forces a specific input method
    mediaTypes?: string[]; // e.g., ['image/jpeg', 'video/mp4']
  };
  title?: boolean; // Requires a title (e.g., YouTube)
  description?: boolean; // Uses separate description field
  requiresPageSelection?: boolean; // e.g., Facebook/LinkedIn pages
  notes?: string[]; // Warnings to show user
}

export const PLATFORM_RULES: Record<Platform, PlatformRule> = {
  facebook: {
    text: { maxLength: 63206 },
    media: { inputType: "file", mediaTypes: ["image/*", "video/*"] },
    requiresPageSelection: true,
  },
  instagram: {
    text: { maxLength: 2200 },
    media: { required: true, inputType: "file", mediaTypes: ["image/*", "video/*"] },
  },
  instagram_business: {
    text: { maxLength: 2200 },
    media: { required: true, inputType: "file", mediaTypes: ["image/*", "video/*"] },
  },
  linkedin: {
    text: { maxLength: 3000 },
    media: { inputType: "file" },
    requiresPageSelection: true,
  },
  twitter: {
    text: { maxLength: 280 },
    media: { inputType: "file", mediaTypes: ["image/*", "video/*"] },
  },
  youtube: {
    title: true, // YouTube needs a Title field
    text: { required: true, maxLength: 5000 }, // Description
    media: { required: true, inputType: "file", mediaTypes: ["video/*"] },
  },
  threads: {
    text: { maxLength: 500 },
    media: { inputType: "file" },
  },
  pinterest: {
    title: true,
    text: { maxLength: 500 },
    media: { required: true, inputType: "file", mediaTypes: ["image/*"] },
  },
};