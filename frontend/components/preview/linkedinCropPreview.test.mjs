import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../../styles/LinkedInPreview.module.css", import.meta.url),
  "utf8"
);
const mediaGrid = readFileSync(new URL("./MediaPreviewGrid.tsx", import.meta.url), "utf8");

test("LinkedIn preview does not crop an already-cropped image into a fixed frame", () => {
  const mediaFrame = styles.match(/\.mediaFrame\s*\{([^}]*)\}/s)?.[1] || "";
  assert.doesNotMatch(mediaFrame, /height:\s*300px/);
  assert.doesNotMatch(styles, /\.mediaFrame\s+:global\(img\)[\s\S]*object-fit:\s*cover\s*!important/);
});

test("LinkedIn media uses the uploaded crop's intrinsic aspect ratio", () => {
  assert.match(mediaGrid, /preserveSingleImageAspect\s*\?\s*"auto"/);
  assert.match(mediaGrid, /preserveSingleImageAspect\s*\?\s*"contain"/);
});
