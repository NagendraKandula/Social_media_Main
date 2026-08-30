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
  assert.match(assistantSource, /e\.key === "Enter" && !e\.shiftKey && !e\.nativeEvent\.isComposing/);
  assert.match(assistantSource, /type="button"/);
  assert.match(assistantSource, /role="status" aria-live="polite"/);
  assert.doesNotMatch(assistantSource, /<input\s+[\s\S]*?className=\{styles\.chatInput\}/);

  assert.match(stylesSource, /\.chatInput\s*\{[\s\S]*?max-height:\s*calc\([^;]*5/);
  assert.match(stylesSource, /\.chatInput\s*\{[\s\S]*?min-height:\s*calc\([^;]*3/);
  assert.match(stylesSource, /\.chatInputRow\s*\{[\s\S]*?position:\s*relative/);
  assert.match(stylesSource, /\.chatButton\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(stylesSource, /@media \(prefers-reduced-motion:\s*reduce\)/);
});
