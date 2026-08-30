import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const publishPath = new URL('./Publish.tsx', import.meta.url);

test('AI platform content immediately updates the currently active editor', async () => {
  const source = await readFile(publishPath, 'utf8');
  const handler = source.match(
    /const handleApplyAiPlatformData = \(aiPlatforms: any\[\]\) => \{([\s\S]*?)\n  \};/,
  )?.[1] ?? '';

  assert.match(handler, /const generatedContents = aiPlatforms\.reduce<ChannelContentMap>/);
  assert.match(handler, /setChannelContents\(\(previousContents\) => \(\{/);
  assert.match(handler, /\.\.\.generatedContents/);
  assert.match(handler, /const currentActiveEditorChannel = activeEditorChannelRef\.current/);
  assert.match(handler, /const activeGeneratedContent = generatedContents\[currentActiveEditorChannel\]/);
  assert.match(handler, /setContent\(activeGeneratedContent\)/);
  assert.match(handler, /const allTabGeneratedContent = Object\.values\(generatedContents\)\.find/);
  assert.match(handler, /setSharedContent\(allTabGeneratedContent\)/);
  assert.match(handler, /setContent\(allTabGeneratedContent\)/);
  assert.match(source, /activeEditorChannelRef\.current = activeEditorChannel/);
});
