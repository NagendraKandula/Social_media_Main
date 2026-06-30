const DIMENSION_ERROR_PATTERN = /\b(dimensions?|aspect ratio|resolution)\b/i;

export const areDimensionOnlyErrors = (errors) =>
  errors.length > 0 &&
  errors.every((error) => DIMENSION_ERROR_PATTERN.test(error));

export const getNewImageIndices = (files, existingFileCount) =>
  files.reduce((indices, file, index) => {
    if (
      index >= existingFileCount &&
      file?.type?.toLowerCase().startsWith("image/")
    ) {
      indices.push(index);
    }

    return indices;
  }, []);

export const getCropOutputFormat = (sourceMimeType) => {
  const mimeType = sourceMimeType?.toLowerCase();

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return { mimeType: "image/jpeg", extension: "jpg", quality: 1 };
  }

  if (mimeType === "image/webp") {
    return { mimeType: "image/webp", extension: "webp", quality: 1 };
  }

  return {
    mimeType: "image/png",
    extension: "png",
    quality: undefined,
  };
};
