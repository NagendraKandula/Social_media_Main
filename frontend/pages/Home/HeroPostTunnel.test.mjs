import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const componentUrl = new URL("./HeroPostTunnel.tsx", import.meta.url);
const stylesheetUrl = new URL(
  "../../styles/HomeCSS/HeroPostTunnel.module.css",
  import.meta.url
);

test("provides an accessible animated post tunnel with all hero assets", async () => {
  const filesExist = await Promise.all(
    [componentUrl, stylesheetUrl].map((url) => access(url).then(() => true, () => false))
  );

  assert.deepEqual(filesExist, [true, true]);

  const [component, stylesheet] = await Promise.all([
    readFile(componentUrl, "utf8"),
    readFile(stylesheetUrl, "utf8"),
  ]);

  assert.equal(
    (component.match(/hero-posts\/[a-z-]+-v3\.png/g) ?? []).length,
    8
  );
  assert.match(component, /requestAnimationFrame/);
  assert.match(component, /prefers-reduced-motion/);
  assert.match(component, /IntersectionObserver/);
  assert.match(component, /aria-label="Social posts across connected channels"/);
  assert.match(stylesheet, /\.tunnel\s*\{/);
  assert.match(stylesheet, /@media \(prefers-reduced-motion: reduce\)/);
});

test("renders a buffered mirrored stream with two equal square cards at the center", async () => {
  const [component, stylesheet] = await Promise.all([
    readFile(componentUrl, "utf8"),
    readFile(stylesheetUrl, "utf8"),
  ]);

  assert.match(component, /const DISPLAY_POSTS = \[\.\.\.POSTS, POSTS\[1\], POSTS\[0\]\]/);
  assert.match(component, /const PAIR_COUNT = DISPLAY_POSTS\.length \/ 2/);
  assert.doesNotMatch(component, /POSTS\[index % POSTS\.length\]/);
  assert.match(component, /data-center-card=\{index < 2 \? "true" : undefined\}/);
  assert.match(component, /className=\{styles\.centerBackdrop\}/);
  assert.match(component, /const pair = Math\.floor\(index \/ 2\)/);
  assert.match(component, /const side = index % 2 === 0 \? -1 : 1/);

  assert.match(stylesheet, /\.centerBackdrop\s*\{/);
  assert.match(stylesheet, /background:\s*#08090c/);
  assert.match(stylesheet, /aspect-ratio:\s*1/);
  assert.match(stylesheet, /margin-inline:\s*clamp\(-/);
  assert.match(stylesheet, /height:\s*clamp\(340px, 28vw, 460px\)/);
  assert.match(component, /const cardWidth = 195 \+ easedProgress \* 145/);
  assert.match(component, /const cardHeight = 195 \+ easedProgress \* 235/);
  assert.match(component, /elapsed \/ 14000/);
  assert.match(component, /const travelProgress = Math\.pow\(progress, 1\.5\)/);
  assert.match(component, /const centerPairOffset = 195 \* 0\.25/);
  assert.match(component, /const x = side \* \(centerPairOffset \+ travelProgress \* width \* 0\.6\)/);
  assert.match(component, /const y = 18 - easedProgress \* 18/);
  assert.doesNotMatch(component, /card\.style\.opacity/);
  assert.doesNotMatch(component, /entryOpacity|fadeOut/);
  assert.match(stylesheet, /width:\s*clamp\(420px, 34vw, 680px\)/);
  assert.match(stylesheet, /transform:\s*translate\(-50%, -50%\)/);
  assert.doesNotMatch(stylesheet, /clip-path:/);
});

test("keeps the supplied post artwork complete without duplicate header overlays", async () => {
  const [component, stylesheet] = await Promise.all([
    readFile(componentUrl, "utf8"),
    readFile(stylesheetUrl, "utf8"),
  ]);

  assert.doesNotMatch(component, /profileHeader/);
  assert.doesNotMatch(component, /PLATFORM_ICONS/);
  assert.match(stylesheet, /object-fit:\s*contain/);
  assert.match(stylesheet, /background:\s*transparent/);
});

test("uses the regenerated borderless v3 post artwork", async () => {
  const component = await readFile(componentUrl, "utf8");

  assert.equal(
    (component.match(/hero-posts\/[a-z-]+-v3\.png/g) ?? []).length,
    8
  );
});
