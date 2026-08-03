import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const component = await readFile(new URL("./MainContent.tsx", import.meta.url), "utf8");
const stylesheet = await readFile(
  new URL("../../styles/HomeCSS/MainContent.module.css", import.meta.url),
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
