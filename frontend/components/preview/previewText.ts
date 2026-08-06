export const toPreviewText = (value = "") =>
  value
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, "")
    .trim();

export interface PreviewTextPart {
  text: string;
  bold: boolean;
}

export const toPreviewRichTextParts = (value = ""): PreviewTextPart[] => {
  const normalized = value
    .replace(/<\/?(strong|b)\b[^>]*>/gi, "**")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, "")
    .trim();

  const parts: PreviewTextPart[] = [];
  const boldPattern = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = boldPattern.exec(normalized)) !== null) {
    if (match.index > cursor) {
      parts.push({ text: normalized.slice(cursor, match.index), bold: false });
    }

    parts.push({ text: match[1], bold: true });
    cursor = match.index + match[0].length;
  }

  if (cursor < normalized.length) {
    parts.push({ text: normalized.slice(cursor), bold: false });
  }

  return parts;
};
