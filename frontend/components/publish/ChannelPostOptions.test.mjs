import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const publishPath = new URL('../../pages/Landing/Tabs/Publish.tsx', import.meta.url);
const optionsPath = new URL('./ChannelPostOptions.tsx', import.meta.url);

test('post options appear only for the active channel and use single-choice radios', async () => {
  const [publishSource, optionsSource] = await Promise.all([
    readFile(publishPath, 'utf8'),
    readFile(optionsPath, 'utf8'),
  ]);

  assert.match(publishSource, /activeEditorChannel && \(/);
  assert.match(publishSource, /<ChannelPostOptions/);
  assert.doesNotMatch(publishSource, /<LazyPlatformFields/);

  assert.match(optionsSource, /type="radio"/);
  assert.match(optionsSource, /name=\{`post-type-\$\{channel\}`\}/);
  assert.match(optionsSource, /Feed/);
  assert.match(optionsSource, /Reel/);
  assert.match(optionsSource, /Story/);
  assert.match(optionsSource, /Post/);
  assert.match(optionsSource, /Shorts/);
});
