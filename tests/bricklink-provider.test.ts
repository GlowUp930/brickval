import assert from "node:assert/strict";
import test from "node:test";

import {
  BrickLinkProviderError,
  classifyBrickLinkFailure,
  isBrickLinkAuthenticationError,
  isBrickLinkConfigurationError,
  isBrickLinkTemporaryError,
} from "../src/lib/bricklink";

test("BrickLink maintenance redirects are classified as temporary", () => {
  assert.equal(
    classifyBrickLinkFailure({
      status: 200,
      finalURL: "https://maintenance.bricklink.com/",
      contentType: "text/html",
    }),
    "temporary",
  );
  assert.equal(
    classifyBrickLinkFailure({
      status: 404,
      finalURL: "https://maintenance.bricklink.com/",
      contentType: "text/html",
    }),
    "temporary",
  );
});

test("BrickLink non-JSON and retryable statuses are classified without exposing the body", () => {
  assert.equal(classifyBrickLinkFailure({ status: 200, contentType: "text/html; charset=utf-8" }), "temporary");
  assert.equal(classifyBrickLinkFailure({ status: 429, contentType: "application/json" }), "temporary");
  assert.equal(classifyBrickLinkFailure({ status: 503, contentType: "application/json" }), "temporary");
});

test("BrickLink authentication and genuine not-found responses stay distinct", () => {
  assert.equal(classifyBrickLinkFailure({ status: 401, contentType: "application/json" }), "authentication");
  assert.equal(classifyBrickLinkFailure({ status: 403, contentType: "application/json" }), "authentication");
  assert.equal(classifyBrickLinkFailure({ status: 404, contentType: "application/json" }), null);
  assert.equal(isBrickLinkTemporaryError(new BrickLinkProviderError("temporary")), true);
  assert.equal(isBrickLinkAuthenticationError(new BrickLinkProviderError("authentication")), true);
  assert.equal(isBrickLinkConfigurationError(new BrickLinkProviderError("configuration")), true);
});

test("HTML 404 responses remain genuine not-found responses", () => {
  assert.equal(classifyBrickLinkFailure({ status: 404, contentType: "text/html" }), null);
});
