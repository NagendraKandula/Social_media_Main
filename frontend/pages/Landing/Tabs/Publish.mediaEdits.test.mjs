import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./Publish.tsx", import.meta.url), "utf8");

test("stores browser crop results by platform placement", () => {
  assert.match(source, /const \[mediaEdits, setMediaEdits\]/);
  assert.match(source, /getMediaEditKey\(file, platform, placement\)/);
  assert.match(source, /onMediaEditApply=\{handleMediaEditApply\}/);
});

test("sends saved or full-image edit instructions in image media slots", () => {
  assert.match(source, /edit:\s*savedEdit\s*\|\|/);
  assert.match(source, /cropWidth:\s*dimensions\.width/);
  assert.match(source, /cropHeight:\s*dimensions\.height/);
  assert.match(source, /placement,/);
});
