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
  },
  twitter: {
    text: { maxLength: 280 },
    media: { inputType: "file" },
  },
  youtube: {
    title: true,
    description: true, // ✅ Explicitly marking description as supported
    text: { required: true, maxLength: 5000 }, 
    media: { required: true, inputType: "file", mediaTypes: ["video/*"] },
  },
  threads: {
    text: { maxLength: 500 },
    media: { inputType: "file" },
  },
  pinterest: {
    title: true,
    description: true,
    text: { maxLength: 500 },
    media: { required: true, inputType: "file", mediaTypes: ["image/*"] },
  },
};