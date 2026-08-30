import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const publishPath = new URL('./Publish.tsx', import.meta.url);
const schedulePath = new URL('../../../components/publish/Schedule.tsx', import.meta.url);
const publishStylesPath = new URL('../../../styles/LandingCSS/Tabs/Publish.module.css', import.meta.url);
const scheduleStylesPath = new URL('../../../components/publish/Schedule.module.css', import.meta.url);

test('Schedule opens in the shared right-side panel instead of a modal', async () => {
  const publish = await readFile(publishPath, 'utf8');

  assert.match(publish, /'ai' \| 'preview' \| 'schedule' \| null/);
  assert.match(publish, /setActiveSidePanel\(\(panel\) => panel === 'schedule' \? null : 'schedule'\)/);
  assert.match(publish, /import Schedule from ['"]\.\.\/\.\.\/\.\.\/components\/publish\/Schedule['"]/);
  assert.match(publish, /<Schedule/);
  assert.doesNotMatch(publish, /PublishSchedulePanel/);
  assert.doesNotMatch(publish, /<PublishScheduleModal/);
  assert.doesNotMatch(publish, /showScheduleModal/);
});

test('the schedule panel provides a themed date-time picker and review action', async () => {
  const [schedule, styles] = await Promise.all([
    readFile(schedulePath, 'utf8'),
    readFile(scheduleStylesPath, 'utf8'),
  ]);

  assert.match(schedule, /export default function Schedule/);
  assert.match(schedule, /import styles from ['"]\.\/Schedule\.module\.css['"]/);
  assert.doesNotMatch(schedule, /type="datetime-local"/);
  assert.match(schedule, /Schedule date and time/);
  assert.match(schedule, /Review scheduled post/);
  assert.match(schedule, /Your local time/);
  assert.match(schedule, /role="grid"/);
  assert.match(schedule, /aria-label="Previous month"/);
  assert.match(schedule, /aria-label="Next month"/);
  assert.match(schedule, />Today</);
  assert.match(schedule, />Clear</);
  assert.match(styles, /\.schedulePanel\s*\{/);
  assert.match(styles, /\.themedDateTimePopover\s*\{/);
  assert.match(styles, /\.scheduleReviewButton\s*\{/);
});

test('the themed calendar uses the requested compact publish dimensions', async () => {
  const [styles, publishStyles] = await Promise.all([
    readFile(scheduleStylesPath, 'utf8'),
    readFile(publishStylesPath, 'utf8'),
  ]);

  assert.match(
    styles,
    /\.themedDateTimePopover\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?width:\s*480px;[\s\S]*?min-width:\s*480px;[\s\S]*?max-width:\s*calc\(100vw - 48px\);[\s\S]*?max-height:\s*380px;[\s\S]*?grid-template-columns:\s*minmax\(270px,\s*1fr\)\s+160px;/,
  );
  assert.match(
    styles,
    /\.themedTimeControls\s*\{[\s\S]*?grid-column:\s*2;[\s\S]*?border-left:\s*1px solid var\(--publish-line\);/,
  );
  assert.match(publishStyles, /\.schedulePane\s*\{[\s\S]*?overflow:\s*visible;/);
  assert.doesNotMatch(publishStyles, /\.themedDateTimePopover\s*\{/);
});

test('the complete month fits inside the 380px calendar height', async () => {
  const styles = await readFile(scheduleStylesPath, 'utf8');

  assert.match(
    styles,
    /\.themedDateTimePopover\s*\{[\s\S]*?max-height:\s*380px;[\s\S]*?overflow:\s*hidden;[\s\S]*?padding:\s*12px;/,
  );
  assert.match(
    styles,
    /\.themedCalendarGrid\s*\{[\s\S]*?gap:\s*2px 4px;/,
  );
  assert.match(
    styles,
    /\.themedCalendarGrid\s*>\s*button\s*\{[\s\S]*?min-height:\s*28px;/,
  );
});

test('schedule typography and icons match the compact side-panel scale', async () => {
  const [schedule, styles] = await Promise.all([
    readFile(schedulePath, 'utf8'),
    readFile(scheduleStylesPath, 'utf8'),
  ]);

  assert.match(schedule, /<CalendarClock size=\{20\}/);
  assert.match(styles, /\.scheduleIcon\s*\{[\s\S]*?width:\s*40px;[\s\S]*?height:\s*40px;/);
  assert.match(styles, /\.scheduleIntro h3\s*\{[\s\S]*?font-size:\s*0\.9rem;/);
  assert.match(styles, /\.scheduleIntro p\s*\{[\s\S]*?font-size:\s*0\.76rem;/);
  assert.match(styles, /\.themedCalendarGrid\s*>\s*button\s*\{[\s\S]*?font-size:\s*0\.78rem;/);
});
