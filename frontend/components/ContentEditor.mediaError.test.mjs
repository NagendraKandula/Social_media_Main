import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const stylesPath = new URL('../styles/ContentEditor.module.css', import.meta.url);

test('long upload errors remain readable without being clipped by the editor footer', async () => {
  const styles = await readFile(stylesPath, 'utf8');

  assert.match(styles, /\.mediaError\s*\{[\s\S]*?max-height:\s*clamp\(/);
  assert.match(styles, /\.mediaError\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(styles, /\.mediaError p\s*\{[\s\S]*?overflow-wrap:\s*anywhere/);
});
