import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editorPath = new URL('./ContentEditor.tsx', import.meta.url);
const publishPath = new URL('../pages/Landing/Tabs/Publish.tsx', import.meta.url);
const planningPath = new URL('../pages/Landing/Tabs/Planning.tsx', import.meta.url);

test('validates character limits against only the active channel editor', async () => {
  const [editor, publish, planning] = await Promise.all([
    readFile(editorPath, 'utf8'),
    readFile(publishPath, 'utf8'),
    readFile(planningPath, 'utf8'),
  ]);

  assert.match(editor, /characterLimitChannels\?: string\[\]/);
  assert.match(editor, /channelsForCharacterLimit = characterLimitChannels \?\? selectedChannels/);
  assert.match(editor, /const charLimitWarnings = channelsForCharacterLimit/);
  assert.match(editor, /const \[charCount, setCharCount\] = useState\(0\)/);
  assert.match(editor, /useIsomorphicLayoutEffect =\s*[\s\S]*?React\.useLayoutEffect : useEffect/);
  assert.match(editor, /setCharCount\(editorRef\.current\.innerText\.length\);[\s\S]*?\}, \[content\]\);/);
  assert.match(editor, /handleInput[\s\S]*?setCharCount\(editorRef\.current\.innerText\.length\)/);
  assert.doesNotMatch(editor, /const charCount = getPlainTextLength\(\)/);

  const activeChannelScope = /characterLimitChannels=\{activeEditorChannel \? \[activeEditorChannel\] : selectedChannelList\}/;
  assert.match(publish, activeChannelScope);
  assert.match(planning, activeChannelScope);
});
