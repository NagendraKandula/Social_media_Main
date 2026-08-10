import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const previewStyles = readFileSync(
  new URL("../styles/DynamicPreview.module.css", import.meta.url),
  "utf8"
);
const previewSource = readFileSync(new URL("./DynamicPreview.tsx", import.meta.url), "utf8");
const publishSource = readFileSync(
  new URL("../pages/Landing/Tabs/Publish.tsx", import.meta.url),
  "utf8"
);

test("maximized preview shows up to three posts and paginates extras with chevrons", () => {
  assert.match(previewSource, /horizontal\?:\s*boolean/);
  assert.match(previewSource, /horizontal\s*\?\s*styles\.previewScrollHorizontal/);
  assert.match(previewSource, /PREVIEWS_PER_PAGE\s*=\s*3/);
  assert.match(previewSource, /previewPlatforms\.slice/);
  assert.match(previewSource, /aria-label="Previous post previews"/);
  assert.match(previewSource, /aria-label="Next post previews"/);
  assert.match(publishSource, /<LazyDynamicPreview[\s\S]*?horizontal[\s\S]*?<\/div>\s*<\/section>/);
  assert.match(
    previewStyles,
    /\.previewScroll\s*\{[^}]*overflow-y:\s*auto;[^}]*flex-direction:\s*column;/s
  );
  assert.match(
    previewStyles,
    /\.previewScrollHorizontal\s*\{[^}]*display:\s*grid;[^}]*overflow:\s*hidden;/s
  );
  assert.match(previewStyles, /\.previewNavigationButton\s*\{/s);
});
