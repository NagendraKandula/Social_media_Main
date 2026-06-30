import test from "node:test";
import assert from "node:assert/strict";

import {
  areDimensionOnlyErrors,
  getCropOutputFormat,
  getNewImageIndices,
} from "./cropValidation.mjs";

test("dimension-only failures can be resolved by cropping", () => {
  assert.equal(
    areDimensionOnlyErrors([
      "photo.jpg does not match LinkedIn recommended dimensions.",
      "banner.png does not match LinkedIn recommended dimensions.",
    ]),
    true
  );
});

test("other validation failures do not open the crop flow", () => {
  assert.equal(
    areDimensionOnlyErrors([
      "photo.jpg does not match LinkedIn recommended dimensions.",
      "photo.jpg cannot be uploaded because it is too large.",
    ]),
    false
  );
});

test("only newly selected images are queued for cropping", () => {
  const existingFile = { type: "image/jpeg" };
  const newImage = { type: "image/png" };
  const newVideo = { type: "video/mp4" };

  assert.deepEqual(
    getNewImageIndices([existingFile, newImage, newVideo], 1),
    [1]
  );
});

test("crop export preserves formats that support transparency", () => {
  assert.deepEqual(getCropOutputFormat("image/png"), {
    mimeType: "image/png",
    extension: "png",
    quality: undefined,
  });
  assert.deepEqual(getCropOutputFormat("image/webp"), {
    mimeType: "image/webp",
    extension: "webp",
    quality: 1,
  });
});

test("crop export keeps JPEGs as JPEG and safely converts other images to PNG", () => {
  assert.deepEqual(getCropOutputFormat("image/jpeg"), {
    mimeType: "image/jpeg",
    extension: "jpg",
    quality: 1,
  });
  assert.deepEqual(getCropOutputFormat("image/gif"), {
    mimeType: "image/png",
    extension: "png",
    quality: undefined,
  });
});
