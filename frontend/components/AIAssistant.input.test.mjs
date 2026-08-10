import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const assistantPath = new URL('./AIAssistant.tsx', import.meta.url);
const stylesPath = new URL('../styles/AIAssistant.module.css', import.meta.url);

test('AI refine instructions grow upward to five lines and preserve multiline input', async () => {
  const [assistantSource, stylesSource] = await Promise.all([
    readFile(assistantPath, 'utf8'),
    readFile(stylesPath, 'utf8'),
  ]);

  assert.match(assistantSource, /<textarea/);
  assert.match(assistantSource, /rows=\{3\}/);
  assert.match(assistantSource, /resizeInstructionInput/);
  assert.match(assistantSource, /\(e\.metaKey \|\| e\.ctrlKey\)/);
  assert.doesNotMatch(assistantSource, /<input\s+[\s\S]*?className=\{styles\.chatInput\}/);

  assert.match(stylesSource, /\.chatInput\s*\{[\s\S]*?max-height:\s*calc\([^;]*5/);
  assert.match(stylesSource, /\.chatInput\s*\{[\s\S]*?min-height:\s*calc\([^;]*3/);
  assert.match(stylesSource, /\.chatInputRow\s*\{[\s\S]*?align-items:\s*flex-end/);
});
