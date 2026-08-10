import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const previewPath = new URL("./LinkedInPreview.tsx", import.meta.url);
const textPath = new URL("./previewText.ts", import.meta.url);

test("LinkedIn preview renders normalized rich-text parts", async () => {
  const [previewSource, textSource] = await Promise.all([
    readFile(previewPath, "utf8"),
    readFile(textPath, "utf8"),
  ]);

  assert.match(previewSource, /toPreviewRichTextParts\(content\)/);
  assert.match(previewSource, /part\.bold\s*\?\s*\(\s*<strong/);
  assert.match(textSource, /export const toPreviewRichTextParts/);
  assert.ok(textSource.includes("/<\\/?(strong|b)\\b[^>]*>/gi"));
  assert.ok(textSource.includes("/\\*\\*(.+?)\\*\\*/g"));
});
