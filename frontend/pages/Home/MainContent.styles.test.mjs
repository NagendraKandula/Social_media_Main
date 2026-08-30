import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const component = await readFile(new URL("./MainContent.tsx", import.meta.url), "utf8");
const stylesheet = await readFile(
  new URL("../../styles/HomeCSS/MainContent.module.css", import.meta.url),
  "utf8"
);
const globalStylesheet = await readFile(
  new URL("../../styles/globals.css", import.meta.url),
  "utf8"
);

test("defines every CSS module class used by MainContent", () => {
  const usedClasses = new Set(
    [...component.matchAll(/styles\.([A-Za-z0-9_]+)/g)].map((match) => match[1])
  );
  const definedClasses = new Set(
    [...stylesheet.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map((match) => match[1])
  );
  const missingClasses = [...usedClasses].filter(
    (className) => !definedClasses.has(className)
  );

  assert.deepEqual(missingClasses, []);
});

test("uses loaded Playfair Display at medium weight for homepage headings", () => {
  const headingSelectors = [
    "heading",
    "sectionHeading",
    "valueTitle",
    "workflowStepTitle",
    "featureTitle",
    "ctaHeading",
  ];

  assert.match(globalStylesheet, /family=Playfair\+Display:wght@500/);

  for (const selector of headingSelectors) {
    const rule = stylesheet.match(
      new RegExp(`\\.${selector}\\s*\\{([\\s\\S]*?)\\}`),
    )?.[1] ?? "";

    assert.match(rule, /font-family:\s*"Playfair Display",\s*Georgia,\s*serif/);
    assert.match(rule, /font-weight:\s*500/);
  }
});

test("does not render decorative eyebrow dots", () => {
  assert.doesNotMatch(component, /styles\.eyebrowDot/);
  assert.doesNotMatch(stylesheet, /\.eyebrowDot\s*\{/);
});

test("uses violet accents without the former yellow theme color", () => {
  const eyebrowRule = stylesheet.match(/\.eyebrow\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const featureAccentRule = stylesheet.match(
    /\.featureCard::before\s*\{([\s\S]*?)\}/,
  )?.[1] ?? "";

  assert.match(eyebrowRule, /rgba\(125, 113, 242,/);
  assert.match(featureAccentRule, /var\(--highlight\)/);
  assert.match(stylesheet, /\.valueIconBadge[\s\S]*?rgba\(125, 113, 242,/);
  assert.match(stylesheet, /\.workflowIconBadge[\s\S]*?rgba\(125, 113, 242,/);
  assert.doesNotMatch(stylesheet, /#f7f37e|rgba\(247,\s*243,\s*126/i);
});

test("does not render the former hero tagline", () => {
  assert.doesNotMatch(component, /Socia AI powered social media management/i);
  assert.doesNotMatch(component, /styles\.heroEyebrow/);
  assert.doesNotMatch(stylesheet, /\.heroEyebrow\s*\{/);
});

test("describes the cross-platform publishing workflow above the integrations", () => {
  assert.doesNotMatch(component, /Seamlessly integrated with/i);
  assert.match(component, /Create, review, schedule, and publish content across/);
  assert.match(component, /Facebook, LinkedIn, YouTube, Threads, Twitter,/);
  assert.match(component, /all from one single AI powered workspace\./);
  assert.match(component, /styles\.descriptionLine/g);
  const descriptionRule = stylesheet.match(
    /\.sectionLabel\s*\{([\s\S]*?)\}/,
  )?.[1] ?? "";
  assert.match(descriptionRule, /font-size:\s*clamp\(0\.9rem,\s*1\.15vw,\s*1\.05rem\)/);
  assert.match(descriptionRule, /text-transform:\s*none/);
  assert.match(descriptionRule, /line-height:\s*1\.55/);
  assert.match(descriptionRule, /font-weight:\s*300/);
  assert.match(descriptionRule, /margin:\s*0 auto 2rem/);
  assert.match(descriptionRule, /transform:\s*translateY\(-22px\)/);
  const platformsRule = stylesheet.match(
    /\.platformsSection\s*\{([\s\S]*?)\}/,
  )?.[1] ?? "";
  assert.match(platformsRule, /transform:\s*translateY\(-18px\)/);
  const platformGridRule = stylesheet.match(
    /\.platformGrid\s*\{([\s\S]*?)\}/,
  )?.[1] ?? "";
  assert.match(platformGridRule, /transform:\s*translateY\(-18px\)/);
});
