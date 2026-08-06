import assert from "node:assert/strict";
import test from "node:test";
import {
  getImageFilter,
  getImageTransform,
  sharpenPixelData,
} from "./imageEditEffects.mjs";

test("builds reversible preview filters and transforms", () => {
  assert.equal(
    getImageFilter({ blur: true, sharpen: true, enhance: true, grayscale: true, invert: true }),
    "blur(2px) contrast(108%) contrast(112%) saturate(118%) grayscale(100%) invert(100%)"
  );
  assert.equal(
    getImageTransform({ zoom: 1.2, rotation: 45, mirror: true, flip: true }),
    "scale(-1.2, -1.2) rotate(45deg)"
  );
});

test("sharpen preserves alpha while increasing edge contrast", () => {
  const pixels = new Uint8ClampedArray([
    20, 20, 20, 255, 20, 20, 20, 255, 20, 20, 20, 255,
    20, 20, 20, 255, 80, 80, 80, 255, 20, 20, 20, 255,
    20, 20, 20, 255, 20, 20, 20, 255, 20, 20, 20, 255,
  ]);

  const result = sharpenPixelData(pixels, 3, 3);
  assert.ok(result[16] > 80);
  assert.equal(result[19], 255);
});
