import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./usePostCreation.ts", import.meta.url), "utf8");

test("media registration sends original image metadata", () => {
  assert.match(source, /readOriginalImageMetadata/);
  assert.match(source, /width:\s*metadata\.width/);
  assert.match(source, /height:\s*metadata\.height/);
  assert.match(source, /fileSizeBytes:\s*file\.size/);
});
