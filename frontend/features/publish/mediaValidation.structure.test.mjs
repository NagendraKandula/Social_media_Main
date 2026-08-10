import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const publishPath = new URL('../../pages/Landing/Tabs/Publish.tsx', import.meta.url);
const validationPath = new URL('./mediaValidation.ts', import.meta.url);

test('media validation is isolated from the Publish page', async () => {
  const [publishSource, validationSource] = await Promise.all([
    readFile(publishPath, 'utf8'),
    readFile(validationPath, 'utf8'),
  ]);

  assert.doesNotMatch(publishSource, /const getImageDimensions/);
  assert.doesNotMatch(publishSource, /const validateFilesForSelectedChannels/);
  assert.match(validationSource, /export const getDisabledChannels/);
  assert.match(validationSource, /export const validateFilesForSelectedChannels/);
});
