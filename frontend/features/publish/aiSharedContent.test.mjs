import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAiPlatformContents,
  getStrictestSharedAiContent,
} from './aiSharedContent.mjs';

const recommendations = [
  {
    platform: 'Instagram',
    caption: 'Instagram caption '.repeat(40),
    cta: 'Explore the collection',
    hashtags: ['#instagram', '#campaign'],
  },
  {
    platform: 'Facebook',
    caption: 'Facebook caption '.repeat(40),
    cta: 'Learn more',
    hashtags: ['#facebook'],
  },
  {
    platform: 'Threads',
    caption: 'Threads caption '.repeat(40),
    cta: 'Join the conversation',
    hashtags: ['#threads'],
  },
];

test('All uses the AI content for the selected channel with the smallest limit', () => {
  const contents = buildAiPlatformContents(recommendations);
  const shared = getStrictestSharedAiContent(
    ['instagram', 'facebook', 'threads'],
    contents,
  );

  assert.equal(shared.limit, 500);
  assert.equal(shared.platform, 'threads');
  assert.ok(shared.content.startsWith('Threads caption'));
  assert.ok(shared.characterCount <= 500);
});

test('All uses the Twitter limit when Twitter is also selected', () => {
  const contents = buildAiPlatformContents([
    ...recommendations,
    {
      platform: 'Twitter',
      caption: 'Twitter caption '.repeat(30),
      cta: 'Read more',
      hashtags: ['#twitter'],
    },
  ]);
  const shared = getStrictestSharedAiContent(
    ['instagram', 'threads', 'twitter'],
    contents,
  );

  assert.equal(shared.limit, 280);
  assert.equal(shared.platform, 'twitter');
  assert.ok(shared.characterCount <= 280);
});

test('All counts CTA and hashtags when enforcing the strictest limit', () => {
  const contents = buildAiPlatformContents([
    {
      platform: 'Threads',
      caption: 'a'.repeat(490),
      cta: 'Join now',
      hashtags: ['#one', '#two'],
    },
  ]);
  const shared = getStrictestSharedAiContent(['threads'], contents);

  assert.equal(shared.characterCount, 500);
  assert.equal(shared.content.length, 500);
});

