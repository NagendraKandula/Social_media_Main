import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publishSource = await readFile(
  new URL("./Publish.tsx", import.meta.url),
  "utf8"
);

test("keeps the editor and platform settings in separate layout regions", () => {
  assert.match(
    publishSource,
    /className=\{styles\.editorSlot\}[\s\S]*?<LazyContentEditor/
  );
  assert.match(
    publishSource,
    /className=\{styles\.platformSlot\}[\s\S]*?<LazyPlatformFields/
  );
});

test("never removes selected channels because media is temporarily incompatible", () => {
  assert.doesNotMatch(
    publishSource,
    /Some selected channels were removed because the current media does not match their publishing limits/
  );
  assert.match(
    publishSource,
    /Array\.from\(disabledChannels\)\.filter\([\s\S]*?!selectedChannels\.has\(channel\)/
  );
});
