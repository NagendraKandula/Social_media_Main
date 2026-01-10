/* =========================================================
   PLATFORM RULES CONFIG
   This file is the single source of truth for:
   - What fields each platform supports
   - Character limits
   - Media requirements
   - Media input type (file vs URL)
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
  | "REELS"
  | "STORY"
  | "STORIES"
  | "SHORT";

/* ---------- Rule Shape ---------- */
export interface PlatformRule {
  /* Text / Caption */
  text?: {
    required: boolean;
    maxLength?: number;
  };

  /* Media rules */
  media?: {
    required: boolean;
    inputType: MediaInputType;
    mediaTypes?: MediaType[];
    requiresMediaType?: boolean;
  };

  /* Extra fields */
  title?: boolean;        // YouTube
  description?: boolean;  // YouTube
  requiresPageSelection?: boolean; // Facebook Pages

  /* UX / API notes */
  notes?: string[];
}

/* =========================================================
   PLATFORM DEFINITIONS
   ========================================================= */

export const PLATFORM_RULES: Record<Platform, PlatformRule> = {
  /* ---------- Twitter ---------- */
  twitter: {
    text: {
      required: true,
      maxLength: 280,
    },
    media: {
      required: false,
      inputType: "file",
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
      inputType: "url",
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
      inputType: "url",
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
      inputType: "url",
      mediaTypes: ["IMAGE", "VIDEO", "STORY"],
      requiresMediaType: true,
    },
    requiresPageSelection: true,
  },

  /* ---------- Instagram (via Facebook) ---------- */
  instagram: {
    media: {
      required: true,
      inputType: "url",
      mediaTypes: ["IMAGE", "REEL", "STORIES"],
      requiresMediaType: true,
    },
    notes: ["Stories do not support captions"],
  },

  /* ---------- Instagram Business ---------- */
  instagram_business: {
    media: {
      required: true,
      inputType: "url",
      mediaTypes: ["IMAGE", "REELS", "STORIES"],
      requiresMediaType: true,
    },
    notes: ["Stories do not support captions"],
  },

  /* ---------- YouTube ---------- */
  youtube: {
    title: true,
    description: true,
    media: {
      required: true,
      inputType: "url",
    },
  },
};
