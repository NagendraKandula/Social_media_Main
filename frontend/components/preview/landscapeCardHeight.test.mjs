import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const previewStyles = [
  ['Instagram', new URL('../../styles/InstagramPreview.module.css', import.meta.url)],
  ['Facebook', new URL('../../styles/FacebookPreview.module.css', import.meta.url)],
  ['LinkedIn', new URL('../../styles/LinkedInPreview.module.css', import.meta.url)],
];

for (const [platform, stylesPath] of previewStyles) {
  test(`${platform} feed cards shrink to landscape media content`, async () => {
    const styles = await readFile(stylesPath, 'utf8');
    const cardRule = styles.match(/\.card\s*\{([^}]*)\}/)?.[1] ?? '';

    assert.match(cardRule, /min-height:\s*0;/);
    assert.doesNotMatch(cardRule, /min-height:\s*400px;/);
    assert.doesNotMatch(cardRule, /height:\s*400px;/);
  });
}
