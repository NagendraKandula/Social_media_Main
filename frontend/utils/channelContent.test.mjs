import assert from "node:assert/strict";
import test from "node:test";

import {
  getChannelContent,
  getNextChannel,
  reconcileChannelContents,
} from "./channelContent.mjs";

test("keeps separate content for every selected channel", () => {
  const contents = reconcileChannelContents(
    ["facebook", "instagram"],
    { facebook: "Facebook copy", instagram: "Instagram copy", linkedin: "Old copy" },
    "Fallback copy"
  );

  assert.deepEqual(contents, {
    facebook: "Facebook copy",
    instagram: "Instagram copy",
  });
});

test("seeds a newly selected channel with the current shared content", () => {
  const contents = reconcileChannelContents(
    ["facebook", "instagram"],
    { facebook: "Tailored Facebook copy" },
    "Original post"
  );

  assert.deepEqual(contents, {
    facebook: "Tailored Facebook copy",
    instagram: "Original post",
  });
});

test("returns the active channel content and falls back safely", () => {
  assert.equal(
    getChannelContent("instagram", { facebook: "Facebook", instagram: "Instagram" }, "Fallback"),
    "Instagram"
  );
  assert.equal(getChannelContent(null, {}, "Fallback"), "Fallback");
});

test("moves between selected channels and wraps at either end", () => {
  const channels = ["facebook", "instagram", "linkedin"];

  assert.equal(getNextChannel(channels, "facebook", 1), "instagram");
  assert.equal(getNextChannel(channels, "linkedin", 1), "facebook");
  assert.equal(getNextChannel(channels, "facebook", -1), "linkedin");
  assert.equal(getNextChannel([], null, 1), null);
});
