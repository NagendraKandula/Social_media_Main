export const getImageFilter = ({ blur, sharpen, enhance, grayscale, invert }) =>
  [
    blur ? "blur(2px)" : "",
    sharpen ? "contrast(108%)" : "",
    enhance ? "contrast(112%) saturate(118%)" : "",
    grayscale ? "grayscale(100%)" : "",
    invert ? "invert(100%)" : "",
  ]
    .filter(Boolean)
    .join(" ") || "none";

export const getImageTransform = ({ zoom, rotation, mirror, flip }) => {
  const horizontalScale = mirror ? -zoom : zoom;
  const verticalScale = flip ? -zoom : zoom;
  return `scale(${horizontalScale}, ${verticalScale}) rotate(${rotation}deg)`;
};

export const sharpenPixelData = (source, width, height) => {
  const output = new Uint8ClampedArray(source);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const outputIndex = (y * width + x) * 4;

      for (let channel = 0; channel < 3; channel += 1) {
        let value = 0;
        let kernelIndex = 0;

        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            const sourceIndex =
              ((y + offsetY) * width + (x + offsetX)) * 4 + channel;
            value += source[sourceIndex] * kernel[kernelIndex];
            kernelIndex += 1;
          }
        }

        output[outputIndex + channel] = value;
      }
    }
  }

  return output;
};
