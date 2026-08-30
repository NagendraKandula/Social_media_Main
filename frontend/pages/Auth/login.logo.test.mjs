import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./login.tsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../../styles/AuthCSS/login.module.css', import.meta.url), 'utf8');

test('Login uses the themed Socia wordmark without changing its layout', () => {
  assert.match(source, /<div className=\{styles\.logo\}>\s*Socia\s*<\/div>/s);
  assert.match(styles, /\.logo\s*{[^}]*font-family:\s*"Playfair Display"[^}]*color:\s*#4f4cbe/s);
  assert.doesNotMatch(source, /styles\.formCard|styles\.illustrationContent/);
});
