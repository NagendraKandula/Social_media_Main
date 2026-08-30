import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editorPath = new URL('./ContentEditor.tsx', import.meta.url);
const editorStylesPath = new URL('../styles/ContentEditor.module.css', import.meta.url);

test('an image that does not fit shows a persistent crop-required badge', async () => {
  const [editorSource, editorStyles] = await Promise.all([
    readFile(editorPath, 'utf8'),
    readFile(editorStylesPath, 'utf8'),
  ]);

  assert.match(editorSource, /className=\{styles\.cropRequiredBadge\}/);
  assert.match(editorSource, />\s*Crop required\s*</);
  assert.doesNotMatch(editorSource, /Dismiss crop required warning/);
  assert.doesNotMatch(editorSource, /dismissedCropWarnings/);
  assert.match(editorSource, /aria-label="Crop image"/);
  assert.match(editorStyles, /\.cropRequiredBadge\s*\{[\s\S]*?background:\s*#(?:ff2d2d|ef4444)/i);
});

test('every newly uploaded image requires crop confirmation by default', async () => {
  const editorSource = await readFile(editorPath, 'utf8');

  assert.match(editorSource, /pendingImageCrops/);
  assert.match(editorSource, /file\.type\.startsWith\("image\/"\)/);
  assert.match(editorSource, /const needsCropping = preview\.isImage && \(pendingImageCrops\[fileKey\]/);
});

test('applying a crop clears the warning for that image', async () => {
  const editorSource = await readFile(editorPath, 'utf8');

  assert.match(
    editorSource,
    /handleInternalMediaEditApply[\s\S]*?setImageFitIssues\([\s\S]*?delete next\[index\]/
  );
});
