import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stylesheet = await readFile(
  new URL("../../styles/HomeCSS/Header.module.css", import.meta.url),
  "utf8"
);
const component = await readFile(new URL("./Header.tsx", import.meta.url), "utf8");
const globalStylesheet = await readFile(
  new URL("../../styles/globals.css", import.meta.url),
  "utf8"
);
const pageStylesheet = await readFile(
  new URL("../../styles/HomeCSS/index.module.css", import.meta.url),
  "utf8"
);

test("keeps the visible home navigation font size consistent across breakpoints", () => {
  const navRules = [...stylesheet.matchAll(/\.nav\s*\{([^}]*)\}/g)].map(
    (match) => match[1]
  );
  const fontSizes = navRules
    .map((rule) => rule.match(/font-size:\s*([^;]+);/)?.[1]?.trim())
    .filter(Boolean);

  assert.ok(fontSizes.length > 0);
  assert.equal(new Set(fontSizes).size, 1);
});

test("provides accessible dropdowns for grouped home navigation content", () => {
  for (const label of ["Features", "Integrations", "Resources"]) {
    assert.match(component, new RegExp(`label:\\s*[\"']${label}[\"']`));
  }

  assert.match(component, /aria-haspopup="menu"/);
  assert.match(component, /aria-expanded=/);
  assert.match(component, /role="menu"/);
  assert.match(stylesheet, /\.dropdownMenu\s*\{/);
});

test("does not show About in the home navigation", () => {
  assert.doesNotMatch(component, />About<\/Link>/);
});

test("uses Playfair Display at medium weight for the homepage logo", () => {
  const logoRule = stylesheet.match(/\.logo\s*\{([\s\S]*?)\}/)?.[1] ?? "";

  assert.match(logoRule, /font-family:\s*"Playfair Display",\s*Georgia,\s*serif/);
  assert.match(logoRule, /font-weight:\s*500/);
  assert.match(logoRule, /font-size:\s*42px/);
  assert.match(stylesheet, /min-width:\s*1440px[\s\S]*?\.logo\s*\{[\s\S]*?font-size:\s*42px/);
  assert.match(stylesheet, /min-width:\s*1536px[\s\S]*?\.logo\s*\{[\s\S]*?font-size:\s*43px/);
  assert.match(stylesheet, /min-width:\s*1800px[\s\S]*?\.logo\s*\{[\s\S]*?font-size:\s*44px/);
});

test("keeps header navigation and actions in Inter", () => {
  const headerRule = stylesheet.match(/\.header\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const actionTypographyRule = stylesheet.match(
    /\.login,\s*\.cta\s*\{([\s\S]*?)\}/,
  )?.[1] ?? "";

  assert.match(globalStylesheet, /family=Inter:/);
  assert.match(headerRule, /font-family:\s*"Inter",\s*sans-serif/);
  assert.match(actionTypographyRule, /font-family:\s*"Inter",\s*sans-serif/);
  assert.match(actionTypographyRule, /font-size:\s*18px/);
  assert.match(actionTypographyRule, /font-weight:\s*400/);
  assert.match(actionTypographyRule, /font-style:\s*normal/);
  assert.match(actionTypographyRule, /letter-spacing:\s*0/);
});

test("uses the lighter compact type treatment for homepage navigation", () => {
  const navRules = [...stylesheet.matchAll(/\.nav\s*\{([^}]*)\}/g)].map(
    (match) => match[1],
  );
  const linkAndTriggerRule = stylesheet.match(
    /\.nav > a,\s*\.navTrigger\s*\{([^}]*)\}/,
  )?.[1] ?? "";

  for (const rule of navRules) {
    if (/font-size:/.test(rule)) assert.match(rule, /font-size:\s*16px/);
  }
  assert.match(linkAndTriggerRule, /font-weight:\s*400/);
});

test("does not reset dropdown trigger typography after matching direct links", () => {
  const triggerRules = [
    ...stylesheet.matchAll(/\.navTrigger\s*\{([^}]*)\}/g),
  ].map((match) => match[1]);

  assert.ok(triggerRules.length > 0);
  assert.doesNotMatch(triggerRules.join("\n"), /font:\s*inherit/);
  assert.match(triggerRules.join("\n"), /font-family:\s*inherit/);
  assert.match(triggerRules.join("\n"), /font-size:\s*inherit/);
});

test("uses the taller desktop header with a violet gradient", () => {
  const headerRule = stylesheet.match(/\.header\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const containerRule = stylesheet.match(
    /\.headerContainer\s*\{([\s\S]*?)\}/,
  )?.[1] ?? "";

  assert.match(headerRule, /height:\s*80px/);
  assert.match(containerRule, /height:\s*80px/);
  assert.match(
    headerRule,
    /linear-gradient\(90deg,\s*#4f4cbe 0%,\s*#7d71f2 100%\)/,
  );
  const backgroundDeclaration = headerRule.match(/background:\s*linear-gradient\([^;]+\);/)?.[0] ?? "";
  assert.doesNotMatch(backgroundDeclaration, /#a69df8/);
  assert.doesNotMatch(stylesheet, /#f7f37e|rgba\(247,\s*243,\s*126/i);
  assert.match(headerRule, /box-shadow:\s*none/);
  assert.match(pageStylesheet, /padding:\s*80px 0 0/);
  assert.match(stylesheet, /max-height:\s*820px[\s\S]*?height:\s*76px/);
  assert.match(stylesheet, /max-width:\s*760px[\s\S]*?height:\s*72px/);
  assert.match(pageStylesheet, /max-height:\s*820px[\s\S]*?padding-top:\s*76px/);
  assert.match(pageStylesheet, /max-width:\s*760px[\s\S]*?padding-top:\s*72px/);
});

test("uses white top-level header text without the former sunlight layer", () => {
  const logoRule = stylesheet.match(/\.logo\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const navRule = stylesheet.match(
    /\.nav > a,\s*\.navTrigger\s*\{([\s\S]*?)\}/,
  )?.[1] ?? "";
  const loginRules = [...stylesheet.matchAll(/\.login\s*\{([\s\S]*?)\}/g)].map(
    (match) => match[1],
  ).join("\n");
  const ctaRules = [...stylesheet.matchAll(/\.cta\s*\{([\s\S]*?)\}/g)].map(
    (match) => match[1],
  ).join("\n");

  assert.doesNotMatch(stylesheet, /\.header::after\s*\{/);
  assert.match(logoRule, /color:\s*#fff/);
  assert.match(navRule, /color:\s*#fff/);
  assert.match(loginRules, /color:\s*#fff/);
  assert.match(ctaRules, /color:\s*#fff/);
  assert.match(ctaRules, /box-shadow:\s*none/);
});
