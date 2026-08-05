import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const aiStylesPath = new URL('../styles/AIAssistant.module.css', import.meta.url);
const publishStylesPath = new URL('../styles/LandingCSS/Tabs/Publish.module.css', import.meta.url);

test('Refine with AI stays positioned without a top divider', async () => {
  const [aiStyles, publishStyles] = await Promise.all([
    readFile(aiStylesPath, 'utf8'),
    readFile(publishStylesPath, 'utf8'),
  ]);

  assert.match(aiStyles, /\.container\s*\{[\s\S]*?min-height:\s*100%/);
  assert.match(aiStyles, /\.chatSection\s*\{[\s\S]*?margin-top:\s*auto/);
  assert.match(aiStyles, /margin-bottom:\s*var\(--ai-refine-bottom-space/);
  assert.match(aiStyles, /\.chatSection\s*\{[\s\S]*?border-top:\s*0/);
  assert.match(publishStyles, /--ai-refine-bottom-space:\s*0px/);
});
