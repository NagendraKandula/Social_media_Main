import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editorPath = new URL('./ContentEditor.tsx', import.meta.url);
const toolbarPath = new URL('./Toolbar.tsx', import.meta.url);
const editorStylesPath = new URL('../styles/ContentEditor.module.css', import.meta.url);

test('ContentEditor renders Toolbar below the writing area without arrow navigation', async () => {
  const [editorSource, toolbarSource] = await Promise.all([
    readFile(editorPath, 'utf8'),
    readFile(toolbarPath, 'utf8'),
  ]);

  assert.match(editorSource, /import Toolbar from "\.\/Toolbar"/);
  assert.match(editorSource, /className=\{styles\.editor\}[\s\S]*?<Toolbar/);
  assert.match(editorSource, /showCharacterCount=\{true\}/);
  assert.doesNotMatch(editorSource, /publishCharacterMeta/);
  assert.doesNotMatch(editorSource, /<div className=\{styles\.toolbarLeft\}>/);
  assert.doesNotMatch(toolbarSource, /ChevronLeft|ChevronRight/);

  for (const accessibleName of [
    'Bold',
    'Italic',
    'Underline',
    'Add link',
    'Add hashtag',
    'Add mention',
    'Add emoji',
  ]) {
    assert.match(toolbarSource, new RegExp(`aria-label="${accessibleName}"`));
  }
});

test('all toolbar icons use the same centered alignment', async () => {
  const editorStyles = await readFile(editorStylesPath, 'utf8');

  assert.match(editorStyles, /\.toolbarLeft button\s*\{[\s\S]*?justify-content:\s*center/);
  assert.doesNotMatch(editorStyles, /\.toolbarLeft button:first-child/);
});

test('the publish toolbar sits below its divider', async () => {
  const editorStyles = await readFile(editorStylesPath, 'utf8');

  assert.match(editorStyles, /\.publishEditorCard \.toolbar\s*\{[\s\S]*?border-top:\s*1px/);
  assert.match(editorStyles, /\.publishEditorCard \.toolbar\s*\{[\s\S]*?border-bottom:\s*0/);
});
