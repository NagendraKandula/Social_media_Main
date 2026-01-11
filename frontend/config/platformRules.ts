/* =========================================================
   PLATFORM RULES CONFIG
   Single source of truth for platform capabilities
   ========================================================= */

/* ---------- Platform Identifiers ---------- */
export type Platform =
  | "twitter"
  | "threads"
  | "linkedin"
  | "facebook"
  | "instagram"
  | "instagram_business"
  | "youtube";

/* ---------- Media Input & Types ---------- */
export type MediaInputType = "file" | "url" | "none";

export type MediaType =
  | "IMAGE"
  | "VIDEO"
  | "REEL"
  | "STORY"
  | "SHORT";

/* ---------- Rule Shape ---------- */
export interface PlatformRule {
  /* Text / Caption */
  text?: {
    required: boolean;
    maxLength?: number;
    disableLinks?: boolean; // ✅ NEW
  };

  /* Media rules */
  media?: {
    required: boolean;
    inputType: MediaInputType;
    mediaTypes?: MediaType[];
    requiresMediaType?: boolean;
  };

  /* Extra fields */
  title?: boolean;
  description?: boolean;
  requiresPageSelection?: boolean;

  /* UX / API notes */
  notes?: string[];
}

/* =========================================================
   PLATFORM DEFINITIONS
   ========================================================= */

export const PLATFORM_RULES: Record<Platform, PlatformRule> = {
  /* ---------- Twitter / X ---------- */
  twitter: {
    text: {
      required: true,
      maxLength: 280,
    },
    media: {
      required: false,
      inputType: "file",
      mediaTypes: ["IMAGE", "VIDEO"],
    },
  },

  /* ---------- Threads ---------- */
  threads: {
    text: {
      required: false,
      maxLength: 500,
    },
    media: {
      required: false,
      inputType: "file",
      mediaTypes: ["IMAGE", "VIDEO"],
    },
  },

  /* ---------- LinkedIn ---------- */
  linkedin: {
    text: {
      required: true,
      maxLength: 3000,
    },
    media: {
      required: false,
      inputType: "file",
      mediaTypes: ["IMAGE", "VIDEO"],
    },
  },

  /* ---------- Facebook Pages ---------- */
  facebook: {
    text: {
      required: false,
    },
    media: {
      required: true,
      inputType: "file",
      mediaTypes: ["IMAGE", "VIDEO", "STORY"],
      requiresMediaType: true,
    },
    requiresPageSelection: true,
  },

  /* ---------- Instagram (via Facebook) ---------- */
  instagram: {
  text: {
    required: false,
    maxLength: 2200,
    disableLinks: true,
  },
  media: {
    required: true,
    inputType: "url", // ✅ CORRECT
    mediaTypes: ["IMAGE", "VIDEO", "REEL", "STORY"],
    requiresMediaType: true,
  },
  notes: [
    "Media must be a publicly accessible URL.",
    "Links in captions are not clickable on Instagram.",
    "Stories do not support captions.",
  ],
},


  /* ---------- Instagram Business ---------- */
  instagram_business: {
    text: {
    required: false,
    maxLength: 2200,
    disableLinks: true,
  },
  media: {
    required: true,
    inputType: "url", // ✅ CORRECT
    mediaTypes: ["IMAGE", "VIDEO", "REEL", "STORY"],
    requiresMediaType: true,
  },
  notes: [
    "Media must be a publicly accessible URL.",
    "Links in captions are not clickable on Instagram.",
    "Stories do not support captions.",
  ],
},
  /* ---------- YouTube ---------- */
  youtube: {
    title: true,
    description: true,
    media: {
      required: true,
      inputType: "file",
      mediaTypes: ["VIDEO", "SHORT"],
    },
  },
};
