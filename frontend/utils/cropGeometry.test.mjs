import assert from "node:assert/strict";
import test from "node:test";
import {
  createCropBox,
  getCropPixels,
  moveCropBox,
  resizeCropBox,
} from "./cropGeometry.mjs";

test("creates the largest centered crop box for a preset ratio", () => {
  assert.deepEqual(createCropBox(1600, 900, 1), {
    x: 21.875,
    y: 0,
    width: 56.25,
    height: 100,
  });
});

test("moves the crop box without allowing it outside the image", () => {
  assert.deepEqual(
    moveCropBox({ x: 20, y: 20, width: 50, height: 50 }, 80, -40),
    { x: 50, y: 0, width: 50, height: 50 }
  );
});

test("resizes a preset crop while preserving its pixel aspect ratio", () => {
  const resized = resizeCropBox(
    { x: 20, y: 10, width: 45, height: 80 },
    "se",
    80,
    95,
    16 / 9,
    1
  );

  assert.ok(Math.abs((resized.width / resized.height) * (16 / 9) - 1) < 0.001);
});

test("converts percentage geometry into exact source pixels", () => {
  assert.deepEqual(
    getCropPixels({ x: 25, y: 10, width: 50, height: 80 }, 1200, 1000),
    { x: 300, y: 100, width: 600, height: 800 }
  );
});
