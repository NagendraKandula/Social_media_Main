const objectUrlCache = new WeakMap<Blob, string>();

export const getStableObjectUrl = (file: Blob) => {
  const cachedUrl = objectUrlCache.get(file);
  if (cachedUrl) return cachedUrl;

  const nextUrl = URL.createObjectURL(file);
  objectUrlCache.set(file, nextUrl);
  return nextUrl;
};
