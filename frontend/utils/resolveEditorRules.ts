// frontend/utils/resolveEditorRules.ts
import { PLATFORM_RULES, Platform } from "../config/platformRules";

export interface EffectiveEditorRules {
  text: {
    enabled: boolean;
    required: boolean;
    maxLength?: number;
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
  const rules = selectedPlatforms.map((p) => PLATFORM_RULES[p]).filter(Boolean);

  const conflicts: string[] = [];
  const notes: string[] = [];

  /* ---------- TEXT ---------- */
  const textRules = rules.filter((r) => r.text);
  const textEnabled = textRules.length > 0 || rules.length === 0;

  const textRequired = textRules.some((r) => r.text?.required);
  
  const maxLengths = textRules
    .map((r) => r.text?.maxLength)
    .filter((n): n is number => n !== undefined);
    
  const strictestLength =
    maxLengths.length > 0 ? Math.min(...maxLengths) : undefined;

  /* ---------- MEDIA ---------- */
  const mediaRules = rules.filter((r) => r.media);
  const mediaEnabled = true; 
  const mediaRequired = mediaRules.some((r) => r.media?.required);

  const inputTypes = new Set(
    mediaRules.map((r) => r.media?.inputType).filter(Boolean)
  );

  let mediaInputType: "file" | "url" | "conflict" | "none" = "file"; 

  if (inputTypes.size === 1) {
    mediaInputType = Array.from(inputTypes)[0] as "file" | "url";
  } else if (inputTypes.size > 1) {
    mediaInputType = "conflict";
    conflicts.push("Selected platforms require different media upload types.");
  }

  /* ---------- FLAGS ---------- */
  const title = rules.some((r) => r.title);
  const description = rules.some((r) => r.description);
  const requiresPageSelection = rules.some((r) => r.requiresPageSelection);

  rules.forEach((r) => {
    if (r.notes) notes.push(...r.notes);
  });

  return {
    text: { enabled: textEnabled, required: textRequired, maxLength: strictestLength },
    media: { enabled: mediaEnabled, required: mediaRequired, inputType: mediaInputType },
    title, description, requiresPageSelection, notes, conflicts,
  };
}
