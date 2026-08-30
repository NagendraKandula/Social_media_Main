import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const planningPath = new URL('./Planning.tsx', import.meta.url);
const schedulePath = new URL('../../../components/publish/Schedule.tsx', import.meta.url);
const planningStylesPath = new URL('../../../styles/LandingCSS/Tabs/Planning.module.css', import.meta.url);

test('Planning reuses the Publish themed schedule picker', async () => {
  const planning = await readFile(planningPath, 'utf8');

  assert.match(
    planning,
    /import\s+\{\s*ScheduleDateTimePicker\s*\}\s+from\s+['"]\.\.\/\.\.\/\.\.\/components\/publish\/Schedule['"]/,
  );
  assert.match(planning, /<ScheduleDateTimePicker/);
  assert.match(planning, /value=\{scheduleDate\}/);
  assert.match(planning, /onChange=\{setScheduleDate\}/);
  assert.match(planning, /disabled=\{isReadOnly \|\| isScheduling\}/);
  assert.doesNotMatch(planning, /type=["']datetime-local["']/);
});

test('the shared picker supports a unique trigger id and disabled state', async () => {
  const schedule = await readFile(schedulePath, 'utf8');

  assert.match(schedule, /interface DateTimePickerProps[\s\S]*?id\?: string;[\s\S]*?disabled\?: boolean;/);
  assert.match(schedule, /export function ScheduleDateTimePicker/);
  assert.match(schedule, /id=\{id\}/);
  assert.match(schedule, /disabled=\{disabled\}/);
});

test('Planning supplies the Publish theme variables needed by selected calendar dates', async () => {
  const styles = await readFile(planningStylesPath, 'utf8');

  assert.match(
    styles,
    /\.scheduleDatePicker\s*\{[\s\S]*?--publish-primary:\s*#4f4cbe;[\s\S]*?--publish-secondary:\s*#7d71f2;[\s\S]*?--publish-ink:\s*#17172b;[\s\S]*?--publish-muted:\s*#6f7085;[\s\S]*?--publish-line:\s*#e9e9f3;/,
  );
});

test('Planning separates the channel selector from a Publish-style composer layout', async () => {
  const [planning, styles] = await Promise.all([
    readFile(planningPath, 'utf8'),
    readFile(planningStylesPath, 'utf8'),
  ]);

  assert.match(planning, /className=\{styles\.scheduleChannelSelector\}[\s\S]*?<ChannelSelector/);
  assert.match(planning, /className=\{styles\.scheduleComposer\}[\s\S]*?className=\{styles\.scheduleComposerControls\}/);
  assert.match(planning, /className=\{styles\.scheduleInlinePlatformSlot\}[\s\S]*?<ChannelPostOptions/);
  assert.match(planning, /className=\{styles\.scheduleEditorSlot\}[\s\S]*?<LazyContentEditor/);
  assert.match(planning, /<LazyContentEditor[\s\S]*?size="publish"/);
  assert.match(planning, /onOpenAIAssistant=\{\(\) => setRightTab\('ai'\)\}/);
  assert.match(styles, /\.scheduleEditorPane\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?gap:\s*18px;/);
  assert.match(
    styles,
    /\.scheduleComposer\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?gap:\s*8px;[\s\S]*?overflow:\s*hidden;[\s\S]*?border:\s*1px solid #d1d5db;[\s\S]*?border-radius:\s*10px;[\s\S]*?background:\s*#ffffff;/,
  );
  assert.match(styles, /\.scheduleComposerControls\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;/);
  assert.match(styles, /\.scheduleComposerControls\s*\{[\s\S]*?padding:\s*12px 14px 0;/);
  assert.match(styles, /\.scheduleEditorSlot\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?padding:\s*0 14px 14px;/);
  assert.doesNotMatch(styles, /\.scheduleEditorSlot\s*\{[^}]*border:\s*1px solid #d1d5db;/);
});

test('Planning preview provides the same maximized dialog as Publish', async () => {
  const [planning, styles] = await Promise.all([
    readFile(planningPath, 'utf8'),
    readFile(planningStylesPath, 'utf8'),
  ]);

  assert.match(planning, /const \[isPreviewMaximized, setIsPreviewMaximized\] = useState\(false\)/);
  assert.match(planning, /aria-label="Maximize post preview"/);
  assert.match(planning, /<Maximize2 size=\{18\}/);
  assert.match(
    planning,
    /<div className=\{styles\.scheduleTabs\}>[\s\S]*?<\/div>\s*<div className=\{styles\.scheduleSideContent\}>[\s\S]*?className=\{styles\.scheduleSideHeader\}[\s\S]*?<h2>Post Preview<\/h2>[\s\S]*?aria-label="Maximize post preview"/,
  );
  assert.match(planning, /className=\{styles\.scheduleSideHeader\}>\s*<h2>AI Assistant<\/h2>/);
  assert.match(planning, /role="dialog"[\s\S]*?aria-modal="true"[\s\S]*?aria-labelledby="planning-maximized-preview-title"/);
  assert.match(planning, /aria-label="Close maximized post preview"/);
  assert.match(planning, /<LazyDynamicPreview[\s\S]*?horizontal/);
  assert.match(styles, /\.scheduleTabs\s*\{[\s\S]*?grid-template-columns:\s*1fr 1fr;/);
  assert.match(styles, /\.scheduleSideHeader\s*\{[\s\S]*?justify-content:\s*space-between;/);
  assert.match(styles, /\.scheduleSideHeader h2\s*\{/);
  assert.doesNotMatch(styles, /\.schedulePreviewMaximizeSlot\s*\{/);
  assert.match(styles, /\.planningPreviewModalBackdrop\s*\{[\s\S]*?position:\s*fixed;/);
  assert.match(styles, /\.planningPreviewModal\s*\{/);
  assert.match(styles, /\.planningPreviewModalBody\s*\{/);
});
