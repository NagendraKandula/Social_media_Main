const objectUrlCache = new WeakMap<any, string>();

export const getStableObjectUrl = (file: any) => {
  if (!file) return "";

  // 1. If the file is already a simple string URL, just return it
  if (typeof file === "string") return file;

  // 2. If it is a scheduled post object from the backend (NOT a File or Blob)
  // We extract the URL string directly from the object properties
  if (!(file instanceof File) && !(file instanceof Blob)) {
    return file.url || file.preview || file.secureUrl || file.mediaUrl || "";
  }

  // 3. At this point, we guarantee it is an actual physical File or Blob
  // So it is safe to use URL.createObjectURL
  const cachedUrl = objectUrlCache.get(file);
  if (cachedUrl) return cachedUrl;

  try {
    const nextUrl = URL.createObjectURL(file);
    objectUrlCache.set(file, nextUrl);
    return nextUrl;
  } catch (error) {
    console.error("Failed to create object URL for file:", file, error);
    return "";
  }
};