const STORY_RATIO = 9 / 16;
const RATIO_TOLERANCE = 0.02;

const storyTarget = (label, platform) => ({
  label,
  platform,
  placement: "STORY",
  minRatio: STORY_RATIO,
  maxRatio: STORY_RATIO,
  idealRatio: STORY_RATIO,
  recommended: "1080x1920 (9:16)",
});

export const getImageFitTargets = (selectedChannels, platformState = {}) => {
  const targets = [];

  if (
    selectedChannels.has("facebook") &&
    platformState.facebookPostType === "story"
  ) {
    targets.push(storyTarget("Facebook Story", "facebook"));
  }

  if (selectedChannels.has("instagram")) {
    if (platformState.instagramPostType === "story") {
      targets.push(storyTarget("Instagram Story", "instagram"));
    } else if ((platformState.instagramPostType || "post") === "post") {
      targets.push({
        label: "Instagram Feed",
        platform: "instagram",
        placement: "FEED",
        minRatio: 4 / 5,
        maxRatio: 1.91,
        idealRatio: 1,
        recommended: "1080x1350, 1080x1080, or 1080x566",
      });
    }
  }

  return targets;
};

const getCroppedPercent = (sourceRatio, targetRatio) =>
  Math.round(
    (1 - Math.min(sourceRatio / targetRatio, targetRatio / sourceRatio)) * 100
  );

export const analyzeImageFit = ({ width, height }, targets) => {
  if (!width || !height) return [];

  const ratio = width / height;
  const orientation = ratio > 1.02 ? "landscape" : ratio < 0.98 ? "portrait" : "square";

  return targets.flatMap((target) => {
    const belowMinimum = ratio < target.minRatio - RATIO_TOLERANCE;
    const aboveMaximum = ratio > target.maxRatio + RATIO_TOLERANCE;
    if (!belowMinimum && !aboveMaximum) return [];

    const closestSupportedRatio = belowMinimum
      ? target.minRatio
      : target.maxRatio;

    return [{
      platform: target.platform,
      placement: target.placement,
      label: target.label,
      width,
      height,
      ratio,
      orientation,
      croppedPercent: getCroppedPercent(ratio, closestSupportedRatio),
      recommended: target.recommended,
    }];
  });
};

const readImageDimensions = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not inspect ${file.name}.`));
    };
    image.src = url;
  });

export const getSelectedImageFitWarnings = async (
  files,
  selectedChannels,
  platformState
) => {
  const targets = getImageFitTargets(selectedChannels, platformState);
  if (targets.length === 0) return [];

  const warnings = await Promise.all(
    files
      .filter((file) => file?.type?.startsWith("image/"))
      .map(async (file) => {
        try {
          const dimensions = await readImageDimensions(file);
          return analyzeImageFit(dimensions, targets).map((result) =>
            `${file.name} is ${result.width}x${result.height} (${result.orientation}, ${result.ratio.toFixed(2)}:1). ` +
            `${result.label} uses a taller/narrower frame, so about ${result.croppedPercent}% of the image may be hidden in the preview. ` +
            `Recommended: ${result.recommended}. You can use the crop tool to adjust it.`
          );
        } catch (error) {
          return [error instanceof Error ? error.message : `Could not inspect ${file.name}.`];
        }
      })
  );

  return [...new Set(warnings.flat())];
};
