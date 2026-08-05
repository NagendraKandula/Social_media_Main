import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const publishPath = new URL('../../pages/Landing/Tabs/Publish.tsx', import.meta.url);
const tabsPath = new URL('./ContentChannelTabs.tsx', import.meta.url);
const tabsStylesPath = new URL('../../styles/ContentChannelTabs.module.css', import.meta.url);

test('Publish provides All and selected-channel content tabs above the editor', async () => {
  const [publishSource, tabsSource] = await Promise.all([
    readFile(publishPath, 'utf8'),
    readFile(tabsPath, 'utf8'),
  ]);

  assert.match(publishSource, /<ContentChannelTabs/);
  assert.match(publishSource, /onSelect=\{handleEditorTabSelect\}/);
  assert.match(publishSource, /<ContentChannelTabs[\s\S]*?<LazyContentEditor/);
  assert.match(tabsSource, />All</);
  assert.match(tabsSource, /selectedChannels\.map/);
  assert.match(tabsSource, /if \(selectedChannels\.length === 0\) return null/);
  assert.match(tabsSource, /aria-pressed=/);
});

test('selected channel tabs stay on one horizontally scrollable line', async () => {
  const tabsStyles = await readFile(tabsStylesPath, 'utf8');

  assert.match(tabsStyles, /flex-wrap:\s*nowrap/);
  assert.match(tabsStyles, /overflow-x:\s*auto/);
});
