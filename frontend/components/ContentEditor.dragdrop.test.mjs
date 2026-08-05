import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editorPath = new URL('./ContentEditor.tsx', import.meta.url);
const dragdropPath = new URL('./Dragdrop.tsx', import.meta.url);
const editorStylesPath = new URL('../styles/ContentEditor.module.css', import.meta.url);

test('ContentEditor delegates media selection and dropping to Dragdrop', async () => {
  const [editorSource, dragdropSource] = await Promise.all([
    readFile(editorPath, 'utf8'),
    readFile(dragdropPath, 'utf8'),
  ]);

  assert.match(editorSource, /import Dragdrop from "\.\/Dragdrop"/);
  assert.match(editorSource, /<Dragdrop onFilesSelected=\{addMediaFiles\} \/>/);
  assert.doesNotMatch(editorSource, /fileInputRef/);
  assert.doesNotMatch(editorSource, /isDraggingMedia/);

  assert.match(dragdropSource, /onDrop=\{handleDrop\}/);
  assert.match(dragdropSource, /multiple/);
  assert.match(dragdropSource, /Drag &amp; drop or/);
  assert.match(dragdropSource, /aria-label="Upload media"/);
});

test('the media drop target and previews use their requested compact sizes', async () => {
  const editorStyles = await readFile(editorStylesPath, 'utf8');

  assert.match(editorStyles, /\.uploadBox\s*\{[\s\S]*?width:\s*96px[\s\S]*?height:\s*96px/);
  assert.match(editorStyles, /\.mediaItem\s*\{[\s\S]*?width:\s*78px[\s\S]*?height:\s*78px/);
  assert.match(editorStyles, /\.mediaGrid\s*\{[\s\S]*?align-self:\s*flex-end/);
  assert.match(editorStyles, /\.uploadBox svg\s*\{[\s\S]*?width:\s*20px/);
});
