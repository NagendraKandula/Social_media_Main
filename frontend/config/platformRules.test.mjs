import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./platformRules.ts", import.meta.url), "utf8");

test("frontend platform rules do not depend on the Prisma backend client", () => {
  assert.doesNotMatch(source, /@prisma\/client/);
  assert.match(source, /export type Platform/);
  assert.match(source, /export const PLATFORM_RULES/);
  assert.match(source, /export const PLATFORM_IMAGE_RULES/);
});
