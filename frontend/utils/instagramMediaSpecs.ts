export type InstagramPostType = "post" | "reel" | "story";

interface MediaDimensions {
  width: number;
  height: number;
}

interface InstagramSpec {
  label: string;
  minRatio: number;
  maxRatio: number;
  recommended: string;
}

const RATIO_TOLERANCE = 0.01;

const INSTAGRAM_SPECS: Record<InstagramPostType, InstagramSpec> = {
  post: {
    label: "Instagram feed",
    minRatio: 4 / 5,
    maxRatio: 1.91,
    recommended: "1080x1080, 1080x1350, or 1080x566",
  },
  reel: {
    label: "Instagram Reel",
    minRatio: 9 / 16,
    maxRatio: 1,
    recommended: "1080x1920",
  },
  story: {
    label: "Instagram Story",
    minRatio: 9 / 16,
    maxRatio: 9 / 16,
    recommended: "1080x1920",
  },
};

const formatRatio = (ratio: number) => ratio.toFixed(2);

const getObjectUrl = (file: File) => URL.createObjectURL(file);

const readImageDimensions = (file: File): Promise<MediaDimensions> =>
  new Promise((resolve, reject) => {
    const url = getObjectUrl(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read dimensions for ${file.name}.`));
    };

    image.src = url;
  });

const readVideoDimensions = (file: File): Promise<MediaDimensions> =>
  new Promise((resolve, reject) => {
    const url = getObjectUrl(file);
    const video = document.createElement("video");

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read dimensions for ${file.name}.`));
    };

    video.src = url;
  });

const readMediaDimensions = (file: File) => {
  if (file.type.startsWith("image/")) {
    return readImageDimensions(file);
  }

  if (file.type.startsWith("video/")) {
    return readVideoDimensions(file);
  }

  throw new Error(`${file.name} is not a supported Instagram media file.`);
};

export async function validateInstagramMediaSpecs(
  files: File[],
  postType: InstagramPostType
) {
  const spec = INSTAGRAM_SPECS[postType];
  const errors: string[] = [];

  if (postType === "story" && files.length > 1) {
    errors.push("Instagram Stories support one media item per request.");
  }

  if (postType !== "story" && files.length > 10) {
    errors.push("Instagram supports a maximum of 10 media items per post.");
  }

  const filesToValidate = postType === "story" ? files.slice(0, 1) : files;

  await Promise.all(
    filesToValidate.map(async (file, index) => {
      try {
        const { width, height } = await readMediaDimensions(file);
        const ratio = width / height;
        const belowMin = ratio < spec.minRatio - RATIO_TOLERANCE;
        const aboveMax = ratio > spec.maxRatio + RATIO_TOLERANCE;

        if (belowMin || aboveMax) {
          errors.push(
            `${spec.label} media ${index + 1} is ${width}x${height} (${formatRatio(
              ratio
            )}:1). Use aspect ratio ${formatRatio(spec.minRatio)}:1${
              spec.minRatio === spec.maxRatio
                ? ""
                : ` to ${formatRatio(spec.maxRatio)}:1`
            }. Recommended size: ${spec.recommended}.`
          );
        }
      } catch (error: any) {
        errors.push(error.message || `Could not validate ${file.name}.`);
      }
    })
  );

  return errors;
}
