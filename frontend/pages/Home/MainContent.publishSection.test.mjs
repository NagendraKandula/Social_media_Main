import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./MainContent.tsx', import.meta.url), 'utf8');
const styles = await readFile(
  new URL('../../styles/HomeCSS/MainContent.module.css', import.meta.url),
  'utf8'
);

test('the Publish preview appears directly before the Planning preview', () => {
  const publishIndex = source.indexOf('id="publishing"');
  const planningIndex = source.indexOf('id="planning"');

  assert.ok(publishIndex >= 0, 'expected a Publish preview section');
  assert.ok(planningIndex > publishIndex, 'expected Publish before Planning');

  const betweenSections = source.slice(publishIndex, planningIndex);
  assert.match(betweenSections, /Publishing/);
  assert.match(betweenSections, /Publish everywhere\./);
  assert.match(source, /styles\.publishScreenshotSection/);
  assert.match(betweenSections, /src="\/images\/home\/publish-preview\.png"/);
  assert.doesNotMatch(betweenSections, /Add your Publish page screenshot here/);
});

test('the Publish screenshot fits fully without cropping or distortion', () => {
  assert.match(styles, /\.publishScreenshotSection\s*{[^}]*max-width:\s*1320px/s);
  assert.match(styles, /\.publishScreenshotSection\s*{[^}]*grid-template-columns:\s*1\.4fr\s+0\.9fr/s);
  assert.match(styles, /\.publishScreenshotFrame\s*{[^}]*aspect-ratio:\s*2500\s*\/\s*1500/s);
  assert.match(styles, /\.publishScreenshot\s*{[^}]*object-fit:\s*contain/s);
  assert.match(source, /width=\{2500\}/);
  assert.match(source, /height=\{1500\}/);
});
