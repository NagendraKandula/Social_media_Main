import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styles = await readFile(
  new URL("../../styles/InstagramPreview.module.css", import.meta.url),
  "utf8"
);

test("Instagram Story uses the same rounded frame as other previews", () => {
  const storyFrame = styles.match(/\.storyFrame\s*\{([\s\S]*?)\}/)?.[1] ?? "";

  assert.match(storyFrame, /border-radius:\s*12px/);
  assert.match(storyFrame, /overflow:\s*hidden/);
});
