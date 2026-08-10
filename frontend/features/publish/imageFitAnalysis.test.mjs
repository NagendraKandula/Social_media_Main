import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeImageFit,
  getImageFitTargets,
} from "./imageFitAnalysis.mjs";

test("detects severe landscape cropping in selected Story placements", () => {
  const targets = getImageFitTargets(
    new Set(["facebook", "instagram"]),
    { facebookPostType: "story", instagramPostType: "story" }
  );
  const results = analyzeImageFit({ width: 1600, height: 900 }, targets);

  assert.deepEqual(results.map((result) => result.label), [
    "Facebook Story",
    "Instagram Story",
  ]);
  assert.ok(results.every((result) => result.croppedPercent >= 68));
});

test("does not warn for a correctly sized 9:16 Story image", () => {
  const targets = getImageFitTargets(
    new Set(["instagram"]),
    { instagramPostType: "story" }
  );

  assert.deepEqual(analyzeImageFit({ width: 1080, height: 1920 }, targets), []);
});

test("ignores Reels because their media editor will be handled separately", () => {
  const targets = getImageFitTargets(
    new Set(["facebook", "instagram"]),
    { facebookPostType: "reel", instagramPostType: "reel" }
  );

  assert.deepEqual(targets, []);
});

test("accepts Instagram feed ratios in the supported range", () => {
  const targets = getImageFitTargets(
    new Set(["instagram"]),
    { instagramPostType: "post" }
  );

  assert.deepEqual(analyzeImageFit({ width: 1080, height: 1350 }, targets), []);
});
