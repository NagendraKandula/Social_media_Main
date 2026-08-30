import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./MainContent.tsx', import.meta.url), 'utf8');
const styles = await readFile(
  new URL('../../styles/HomeCSS/MainContent.module.css', import.meta.url),
  'utf8'
);

test('Home includes a themed semantic footer with useful navigation', () => {
  assert.doesNotMatch(source, /styles\.bottomCtaSection/);
  assert.doesNotMatch(source, /Start managing every social channel/);
  assert.match(source, /<footer className=\{styles\.siteFooter\}/);
  assert.match(source, /<span className=\{styles\.footerLogo\}>Socia<\/span>/);
  assert.match(source, /aria-label="Footer navigation"/);
  assert.match(source, /href="\/Auth\/login"/);
  assert.match(source, /href="\/Auth\/register"/);
  assert.match(source, /© \{new Date\(\)\.getFullYear\(\)\} Socia/);
});

test('Home footer uses the established purple and white theme responsively', () => {
  assert.match(styles, /\.siteFooter\s*{[^}]*linear-gradient[^}]*#4f4cbe[^}]*#7d71f2/s);
  assert.match(styles, /\.footerLogo\s*{[^}]*"Playfair Display"/s);
  assert.match(styles, /@media \(max-width: 768px\)[\s\S]*\.footerGrid/s);
});
