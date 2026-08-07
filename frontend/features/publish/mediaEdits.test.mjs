import assert from "node:assert/strict";
import test from "node:test";
import {
  getImageEditDestinations,
  getMediaEditKey,
  getPlatformPlacement,
  hasRasterOnlyEffects,
} from "./mediaEdits.mjs";

test("builds only the currently selected placement for each channel", () => {
  assert.deepEqual(
    getImageEditDestinations(
      ["facebook", "instagram", "threads"],
      { facebookPostType: "feed", instagramPostType: "story" }
    ),
    [
      { platform: "facebook", placement: "FEED", label: "Facebook Feed", ratio: 4 / 5 },
      { platform: "instagram", placement: "STORY", label: "Instagram Story", ratio: 9 / 16 },
      { platform: "threads", placement: "FEED", label: "Threads Post", ratio: 4 / 5 },
    ]
  );
});

test("does not offer video-only destinations in the image editor", () => {
  const placements = getImageEditDestinations(
    ["facebook", "instagram"],
    { facebookPostType: "reel", instagramPostType: "reel" }
  )
    .map(({ placement }) => placement);

  assert.equal(placements.includes("REEL"), false);
  assert.equal(placements.length, 0);
});

test("maps frontend post types to backend Placement values", () => {
  assert.equal(getPlatformPlacement("facebook", { facebookPostType: "story" }), "STORY");
  assert.equal(getPlatformPlacement("instagram", { instagramPostType: "post" }), "FEED");
  assert.equal(getPlatformPlacement("instagram", { instagramPostType: "reel" }), "REEL");
  assert.equal(getPlatformPlacement("youtube", { youtubeType: "shorts" }), "SHORT");
  assert.equal(getPlatformPlacement("linkedin", {}), "FEED");
});

test("builds a platform and placement-specific media edit key", () => {
  const file = { name: "photo.jpg", size: 1200, lastModified: 42 };
  assert.equal(
    getMediaEditKey(file, "instagram", "STORY"),
    "photo.jpg:1200:42:INSTAGRAM:STORY"
  );
});

test("identifies effects which must remain rasterized in the browser", () => {
  assert.equal(hasRasterOnlyEffects({ rotation: 0, blur: false }), false);
  assert.equal(hasRasterOnlyEffects({ rotation: 45 }), true);
  assert.equal(hasRasterOnlyEffects({ grayscale: true }), true);
});
