const PLATFORM_CHARACTER_LIMITS = {
  twitter: 280,
  threads: 500,
  instagram: 2200,
  linkedin: 3000,
  youtube: 5000,
  facebook: 63206,
};

const normalizePlatform = (platform = '') => {
  const normalized = String(platform).trim().toLowerCase();
  return normalized === 'x' ? 'twitter' : normalized;
};

const toPlainText = (html = '') => String(html)
  .replace(/<br\s*\/?\s*>/gi, '\n')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/gi, ' ')
  .trim();

export function buildAiPlatformContents(aiPlatforms = []) {
  return aiPlatforms.reduce((contents, aiPlatform) => {
    const platform = normalizePlatform(aiPlatform?.platform);
    if (!platform) return contents;

    const caption = String(aiPlatform?.caption || '').trim();
    const cta = String(aiPlatform?.cta || '').trim();
    const hashtags = Array.isArray(aiPlatform?.hashtags)
      ? aiPlatform.hashtags.filter(Boolean).join(' ')
      : '';
    const sections = [caption, cta ? `<strong>${cta}</strong>` : '', hashtags]
      .filter(Boolean);

    contents[platform] = sections.join('<br/><br/>');
    return contents;
  }, {});
}

export function getStrictestSharedAiContent(selectedChannels = [], channelContents = {}) {
  const normalizedSelection = [...new Set(selectedChannels.map(normalizePlatform))]
    .filter((platform) => channelContents[platform]);
  const candidatePlatforms = normalizedSelection.length > 0
    ? normalizedSelection
    : Object.keys(channelContents);

  const platform = candidatePlatforms.reduce((strictest, candidate) => {
    if (!strictest) return candidate;
    const candidateLimit = PLATFORM_CHARACTER_LIMITS[candidate] ?? 2200;
    const strictestLimit = PLATFORM_CHARACTER_LIMITS[strictest] ?? 2200;
    return candidateLimit < strictestLimit ? candidate : strictest;
  }, null);

  if (!platform) {
    return { content: '', characterCount: 0, limit: 0, platform: null };
  }

  const limit = PLATFORM_CHARACTER_LIMITS[platform] ?? 2200;
  const content = toPlainText(channelContents[platform]).slice(0, limit);

  return { content, characterCount: content.length, limit, platform };
}

