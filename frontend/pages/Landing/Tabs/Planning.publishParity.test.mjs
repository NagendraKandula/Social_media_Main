import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const planningPath = new URL('./Planning.tsx', import.meta.url);

test('Planning applies AI platform content to All and the currently active channel', async () => {
  const source = await readFile(planningPath, 'utf8');

  assert.match(source, /activeEditorChannelRef\.current = activeEditorChannel/);
  assert.match(source, /const handleApplyAiPlatformData = \(aiPlatforms: any\[\]\) =>/);
  assert.match(source, /setChannelContents\(\(previousContents\) => \(\{/);
  assert.match(source, /setSharedContent\(allTabGeneratedContent\)/);
  assert.match(source, /onApplyPlatformData=\{handleApplyAiPlatformData\}/);
});

test('Planning enforces the same channel and media validation used by Publish', async () => {
  const source = await readFile(planningPath, 'utf8');

  assert.match(source, /getDisabledChannels/);
  assert.match(source, /validateFilesForSelectedChannels/);
  assert.match(source, /getInstagramValidationErrors/);
  assert.match(source, /getFacebookValidationErrors/);
  assert.match(source, /disabledChannels=\{channelSelectorDisabledChannels\}/);
  assert.match(source, /validateFilesForSelectedChannels=\{validateCurrentFiles\}/);
  assert.match(source, /await readImageDimensions\(file\)/);
});

test('Planning validates content across every selected channel before saving', async () => {
  const source = await readFile(planningPath, 'utf8');

  assert.match(source, /const hasPublishableContent = selectedChannelList\.some/);
  assert.match(source, /if \(!hasPublishableContent && files\.length === 0\)/);
});

test('Planning AI analysis preserves the channels selected by the user', async () => {
  const source = await readFile(planningPath, 'utf8');

  assert.doesNotMatch(source, /onAutoSelectPlatforms=/);
  assert.doesNotMatch(source, /const handleAutoSelectPlatforms =/);
});
