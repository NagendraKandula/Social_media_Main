import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const timestampPreviews = [
  "FacebookPreview.tsx",
  "InstagramPreview.tsx",
  "LinkedInPreview.tsx",
  "ThreadsPreview.tsx",
];

test("uses Just now for every timestamp rendered by post previews", async () => {
  const sources = await Promise.all(
    timestampPreviews.map((file) =>
      readFile(new URL(`./${file}`, import.meta.url), "utf8")
    )
  );
  const combinedSource = sources.join("\n");

  assert.doesNotMatch(combinedSource, />\s*(?:21h|1h|Just Now)\b/);
  assert.equal(combinedSource.match(/Just now/g)?.length, 5);
});
