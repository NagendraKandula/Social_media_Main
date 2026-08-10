import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publishSource = await readFile(
  new URL("./Publish.tsx", import.meta.url),
  "utf8"
);
const publishStyles = await readFile(
  new URL("../../../styles/LandingCSS/Tabs/Publish.module.css", import.meta.url),
  "utf8"
);

test("keeps channel and platform controls above the editor", () => {
  assert.match(
    publishSource,
    /className=\{styles\.composerControls\}[\s\S]*?<ChannelPostOptions/
  );
  assert.match(
    publishSource,
    /<ChannelPostOptions[\s\S]*?className=\{styles\.editorSlot\}/
  );
});

test("places active channel options at the right edge", () => {
  assert.match(
    publishStyles,
    /\.inlinePlatformSlot\s*\{[\s\S]*?grid-column:\s*2[\s\S]*?justify-self:\s*end/
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

test("does not show a redundant live preview label", () => {
  assert.doesNotMatch(publishSource, />Live preview</i);
  assert.match(publishSource, /'Post Preview'/);
});

test("provides an accessible maximized preview dialog", () => {
  assert.match(publishSource, /aria-label="Maximize post preview"/);
  assert.match(publishSource, /role="dialog"/);
  assert.match(publishSource, /aria-modal="true"/);
  assert.match(publishSource, /event\.key === 'Escape'/);
  assert.match(publishStyles, /\.previewModalBackdrop\s*\{/);
});

test("does not draw a divider below the post preview header", () => {
  const rightHeader = publishStyles.match(/\.rightHeader\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.doesNotMatch(rightHeader, /border-bottom/);
});

test("connects the editor Ask AI action to the AI side panel", () => {
  assert.match(
    publishSource,
    /<LazyContentEditor[\s\S]*?onOpenAIAssistant=\{\(\) => setActiveSidePanel\('ai'\)\}/
  );
});
