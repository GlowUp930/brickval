import assert from "node:assert/strict";
import test from "node:test";

import { getBrickLinkPreviewImageUrl, normalizeImageUrl } from "../lib/image-url";

test("normalizeImageUrl converts BrickLink protocol-relative URLs to https", () => {
  assert.equal(normalizeImageUrl("//img.bricklink.com/ML/ncklc007.jpg"), "https://img.bricklink.com/ML/ncklc007.jpg");
});

test("normalizeImageUrl trims whitespace and preserves absolute URLs", () => {
  assert.equal(normalizeImageUrl(" https://example.com/image.png "), "https://example.com/image.png");
});

test("getBrickLinkPreviewImageUrl builds minifig and part thumbnails", () => {
  assert.equal(getBrickLinkPreviewImageUrl("minifig", "NCKLC007"), "https://img.bricklink.com/ML/ncklc007.jpg");
  assert.equal(getBrickLinkPreviewImageUrl("part", "3001"), "https://img.bricklink.com/PL/3001.jpg");
});
