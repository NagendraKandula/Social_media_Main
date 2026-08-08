export const getPlatformPlacement = (platform, platformState = {}) => {
  if (platform === "facebook") {
    return (platformState.facebookPostType || "feed").toUpperCase();
  }

  if (platform === "instagram") {
    const postType = platformState.instagramPostType || "post";
    return postType === "post" ? "FEED" : postType.toUpperCase();
  }

  if (platform === "youtube") {
    return platformState.youtubeType === "shorts" ? "SHORT" : "FEED";
  }

  return "FEED";
};

const IMAGE_DESTINATIONS = {
  facebook: [
    { placement: "FEED", label: "Facebook Feed", ratio: 4 / 5 },
    { placement: "STORY", label: "Facebook Story", ratio: 9 / 16 },
  ],
  instagram: [
    { placement: "FEED", label: "Instagram Post", ratio: 4 / 5 },
    { placement: "STORY", label: "Instagram Story", ratio: 9 / 16 },
  ],
  linkedin: [{ placement: "FEED", label: "LinkedIn Post", ratio: 4 / 5 }],
  threads: [{ placement: "FEED", label: "Threads Post", ratio: 4 / 5 }],
  twitter: [{ placement: "FEED", label: "X Post", ratio: 16 / 9 }],
  pinterest: [{ placement: "FEED", label: "Pinterest Pin", ratio: 2 / 3 }],
};

export const getImageEditDestinations = (selectedChannels = [], platformState = {}) =>
  selectedChannels.flatMap((platform) => {
    const destinations = IMAGE_DESTINATIONS[platform] || [];
    const selectedPlacement = getPlatformPlacement(platform, platformState);
    const selectedDestination = destinations.find(
      ({ placement }) => placement === selectedPlacement
    );

    return selectedDestination
      ? [{ platform, ...selectedDestination }]
      : [];
  });

export const getMediaEditKey = (file, platform, placement) =>
  `${file.name}:${file.size}:${file.lastModified || 0}:${platform.toUpperCase()}:${placement}`;

export const hasRasterOnlyEffects = (effects = {}) =>
  Boolean(
    effects.rotation ||
    effects.mirror ||
    effects.flip ||
    effects.blur ||
    effects.sharpen ||
    effects.enhance ||
    effects.grayscale ||
    effects.invert
  );

export const readImageDimensions = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read image dimensions for ${file.name}.`));
    };
    image.src = url;
  });
