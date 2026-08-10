import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editorStylesPath = new URL('../styles/ContentEditor.module.css', import.meta.url);
const publishStylesPath = new URL('../styles/LandingCSS/Tabs/Publish.module.css', import.meta.url);

test('long publish captions scroll inside the writing area', async () => {
  const [editorStyles, publishStyles] = await Promise.all([
    readFile(editorStylesPath, 'utf8'),
    readFile(publishStylesPath, 'utf8'),
  ]);

  assert.match(editorStyles, /\.publishEditorCard\s*\{[\s\S]*?height:\s*100%[\s\S]*?min-height:\s*0/);
  assert.match(editorStyles, /\.publishEditorCard \.editor\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(editorStyles, /\.publishEditorCard \.editor\s*\{[\s\S]*?overscroll-behavior:\s*contain/);
  assert.match(publishStyles, /\.editorSlot\s*\{[\s\S]*?overflow:\s*hidden/);
});
