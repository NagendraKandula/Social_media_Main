import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const grid = read("./MediaPreviewGrid.tsx");

test("single-image feed previews preserve the confirmed crop aspect ratio", () => {
  assert.match(grid, /preserveSingleImageAspect/);
  assert.match(grid, /preserveSingleImageAspect\s*\?\s*"auto"/);
  assert.match(grid, /preserveSingleImageAspect\s*\?\s*"contain"/);
});

for (const [platform, path, selector] of [
  ["Instagram", "../../styles/InstagramPreview.module.css", ".mediaFrame"],
  ["Facebook", "../../styles/FacebookPreview.module.css", ".mediaFrame"],
  ["Threads", "../../styles/ThreadsPreview.module.css", ".mediaCard"],
  ["X", "../../styles/TwitterPreview.module.css", ".media"],
]) {
  test(`${platform} feed preview does not impose a second crop`, () => {
    const css = read(path);
    const block = css.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`, "s"))?.[1] || "";
    assert.doesNotMatch(block, /height:\s*300px|min-height:\s*300px|max-height:\s*300px/);
    assert.doesNotMatch(css, new RegExp(`\\${selector}[\\s\\S]{0,260}object-fit:\\s*cover\\s*!important`));
  });
}
