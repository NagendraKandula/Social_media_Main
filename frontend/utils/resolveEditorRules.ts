import {
  PLATFORM_RULES,
  Platform,
  PlatformRule,
} from "../config/platformRules";

export interface EffectiveEditorRules {
  text: {
    enabled: boolean;
    required: boolean;
    maxLength?: number;
    disableLinks?: boolean; // ✅ ADDED
  };
  media: {
    enabled: boolean;
    required: boolean;
    inputType: "file" | "url" | "conflict" | "none";
    mediaTypes?: string[];
  };
  title: boolean;
  description: boolean;
  requiresPageSelection: boolean;
  notes: string[];
  conflicts: string[];
}

export function resolveEditorRules(
  selectedPlatforms: Platform[]
): EffectiveEditorRules {
  /* =====================================================
     DEFAULT RULES (when no platform is selected)
     ===================================================== */
  if (selectedPlatforms.length === 0) {
    return {
      text: {
        enabled: true,
        required: false,
        maxLength: 3000,
        disableLinks: false, // ✅ DEFAULT
      },
      media: {
        enabled: true,
        required: false,
        inputType: "url",
      },
      title: false,
      description: false,
      requiresPageSelection: false,
      notes: [],
      conflicts: [],
    };
  }

  /* =====================================================
     PLATFORM-BASED RULE RESOLUTION
     ===================================================== */
  const rules: PlatformRule[] = selectedPlatforms
    .map((p) => PLATFORM_RULES[p])
    .filter(Boolean);

  const conflicts: string[] = [];
  const notes: string[] = [];

  /* ---------- TEXT ---------- */
  const textRules = rules.filter((r) => r.text);

  const textRequired = textRules.some(
    (r) => r.text?.required
  );

  const maxLengthValues = textRules
    .map((r) => r.text?.maxLength)
    .filter(
      (v): v is number => typeof v === "number"
    );

  const strictestLength =
    maxLengthValues.length > 0
      ? Math.min(...maxLengthValues)
      : undefined;

  // ✅ NEW: disable links if ANY platform disables them
  const disableLinks = textRules.some(
    (r) => r.text?.disableLinks === true
  );

  /* ---------- MEDIA ---------- */
  const mediaRules = rules.filter((r) => r.media);

  const mediaRequired = mediaRules.some(
    (r) => r.media?.required
  );

  const inputTypes = new Set(
    mediaRules
      .map((r) => r.media?.inputType)
      .filter(Boolean)
  );

  let mediaInputType: "file" | "url" | "conflict" | "none" =
    "none";

  if (inputTypes.size === 1) {
    mediaInputType = Array.from(inputTypes)[0] as
      | "file"
      | "url";
  } else if (inputTypes.size > 1) {
    mediaInputType = "conflict";
    conflicts.push(
      "Selected platforms require different media upload types."
    );
  }

  /* ---------- MEDIA TYPES ---------- */
  const mediaTypes = Array.from(
    new Set(
      mediaRules.flatMap(
        (r) => r.media?.mediaTypes || []
      )
    )
  );

  /* ---------- EXTRA FLAGS ---------- */
  const title = rules.some((r) => r.title);
  const description = rules.some((r) => r.description);
  const requiresPageSelection = rules.some(
    (r) => r.requiresPageSelection
  );

  rules.forEach((r) => {
    if (r.notes) notes.push(...r.notes);
  });

  /* =====================================================
     FINAL EFFECTIVE RULES
     ===================================================== */
  return {
    text: {
      enabled: true,
      required: textRequired,
      maxLength: strictestLength,
      disableLinks, // ✅ PASSED TO EDITOR
    },
    media: {
      enabled: true,
      required: mediaRequired,
      inputType: mediaInputType,
      mediaTypes:
        mediaTypes.length > 0
          ? mediaTypes
          : undefined,
    },
    title,
    description,
    requiresPageSelection,
    notes,
    conflicts,
  };
}
