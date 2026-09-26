import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const assistant = await readFile(new URL('./AIAssistant.tsx', import.meta.url), 'utf8');
const publish = await readFile(new URL('../pages/Landing/Tabs/Publish.tsx', import.meta.url), 'utf8');
const planning = await readFile(new URL('../pages/Landing/Tabs/Planning.tsx', import.meta.url), 'utf8');
const backendService = await readFile(
  new URL('../../Backend/src/ai-assistant/ai-assistant.service.ts', import.meta.url),
  'utf8',
);

test('AI analysis sends only the channels selected by the user', () => {
  assert.match(assistant, /selectedChannels:\s*string\[\]/);
  assert.match(assistant, /selectedChannels\.forEach\(\(platform\) => formData\.append\('platforms', platform\)\)/);
  assert.match(publish, /selectedChannels=\{selectedChannelList\}/);
  assert.match(planning, /selectedChannels=\{selectedChannelList\}/);
});

test('AI analysis does not auto-select recommended channels', () => {
  assert.doesNotMatch(assistant, /onAutoSelectPlatforms/);
  assert.doesNotMatch(publish, /handleAutoSelectPlatforms/);
});

test('backend prioritizes explicitly requested platforms over all connected profiles', () => {
  assert.match(
    backendService,
    /const requestedPlatforms = [\s\S]*?dto\.platforms[\s\S]*?activePlatforms = requestedPlatforms\.length > 0[\s\S]*?requestedPlatforms[\s\S]*?: connectedPlatforms/,
  );
});

