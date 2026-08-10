const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const round = (value) => Math.round(value * 1000) / 1000;

export const createCropBox = (imageWidth, imageHeight, targetRatio) => {
  const imageRatio = imageWidth / imageHeight;
  const width = imageRatio > targetRatio ? (targetRatio / imageRatio) * 100 : 100;
  const height = imageRatio > targetRatio ? 100 : (imageRatio / targetRatio) * 100;

  return {
    x: round((100 - width) / 2),
    y: round((100 - height) / 2),
    width: round(width),
    height: round(height),
  };
};

export const moveCropBox = (box, deltaX, deltaY) => ({
  ...box,
  x: round(clamp(box.x + deltaX, 0, 100 - box.width)),
  y: round(clamp(box.y + deltaY, 0, 100 - box.height)),
});

const resizeCustomBox = (box, handle, pointerX, pointerY) => {
  const minimum = 8;
  let left = box.x;
  let right = box.x + box.width;
  let top = box.y;
  let bottom = box.y + box.height;

  if (handle.includes("w")) left = clamp(pointerX, 0, right - minimum);
  if (handle.includes("e")) right = clamp(pointerX, left + minimum, 100);
  if (handle.includes("n")) top = clamp(pointerY, 0, bottom - minimum);
  if (handle.includes("s")) bottom = clamp(pointerY, top + minimum, 100);

  return {
    x: round(left),
    y: round(top),
    width: round(right - left),
    height: round(bottom - top),
  };
};

export const resizeCropBox = (
  box,
  handle,
  pointerX,
  pointerY,
  imageRatio,
  targetRatio
) => {
  if (!targetRatio) return resizeCustomBox(box, handle, pointerX, pointerY);

  const ratioInPercentSpace = targetRatio / imageRatio;
  const minimumHeight = 8;
  const minimumWidth = minimumHeight * ratioInPercentSpace;
  const left = box.x;
  const right = box.x + box.width;
  const top = box.y;
  const bottom = box.y + box.height;
  let width;
  let height;
  let x;
  let y;

  if ((handle.includes("e") || handle.includes("w")) && (handle.includes("n") || handle.includes("s"))) {
    const anchorX = handle.includes("w") ? right : left;
    const anchorY = handle.includes("n") ? bottom : top;
    const availableWidth = Math.abs(clamp(pointerX, 0, 100) - anchorX);
    const availableHeight = Math.abs(clamp(pointerY, 0, 100) - anchorY);
    width = Math.max(minimumWidth, Math.min(availableWidth, availableHeight * ratioInPercentSpace));
    height = width / ratioInPercentSpace;
    x = handle.includes("w") ? anchorX - width : anchorX;
    y = handle.includes("n") ? anchorY - height : anchorY;
  } else if (handle === "e" || handle === "w") {
    const anchorX = handle === "w" ? right : left;
    width = Math.max(minimumWidth, Math.abs(clamp(pointerX, 0, 100) - anchorX));
    height = width / ratioInPercentSpace;
    height = Math.min(height, 100);
    width = height * ratioInPercentSpace;
    x = handle === "w" ? anchorX - width : anchorX;
    y = clamp(top + (box.height - height) / 2, 0, 100 - height);
  } else {
    const anchorY = handle === "n" ? bottom : top;
    height = Math.max(minimumHeight, Math.abs(clamp(pointerY, 0, 100) - anchorY));
    width = height * ratioInPercentSpace;
    width = Math.min(width, 100);
    height = width / ratioInPercentSpace;
    x = clamp(left + (box.width - width) / 2, 0, 100 - width);
    y = handle === "n" ? anchorY - height : anchorY;
  }

  x = clamp(x, 0, 100 - width);
  y = clamp(y, 0, 100 - height);

  return { x: round(x), y: round(y), width: round(width), height: round(height) };
};

export const getCropPixels = (box, imageWidth, imageHeight) => ({
  x: Math.round((box.x / 100) * imageWidth),
  y: Math.round((box.y / 100) * imageHeight),
  width: Math.round((box.width / 100) * imageWidth),
  height: Math.round((box.height / 100) * imageHeight),
});
