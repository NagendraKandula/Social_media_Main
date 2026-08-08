import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const renderSource = readFileSync(new URL("./render.service.ts", import.meta.url), "utf8");
const publisherSource = readFileSync(new URL("../posting/posting.processor.ts", import.meta.url), "utf8");

test("renderer processes every media slot instead of one slot per platform", () => {
  assert.match(renderSource, /for \(const slot of post\.mediaSlots\)/);
  assert.doesNotMatch(renderSource, /const slotMap = new Map/);
  assert.match(renderSource, /slot\.position/);
});

test("ready variants are signed at publishing time", () => {
  assert.match(renderSource, /cdnUrl:\s*''/);
  assert.match(publisherSource, /getSignedReadUrl\(targetPath/);
  assert.doesNotMatch(publisherSource, /let signedUrl = readyVariant\?\.cdnUrl \|\| ''/);
});
