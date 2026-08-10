export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 MB';

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function getContentSnippet(content: string, mediaCount: number) {
  const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plainText) return plainText.length > 72 ? `${plainText.slice(0, 72)}...` : plainText;
  if (mediaCount > 0) return `Media post with ${mediaCount} file${mediaCount === 1 ? '' : 's'}`;
  return 'Untitled post';
}
