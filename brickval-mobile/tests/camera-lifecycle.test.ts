import assert from "node:assert/strict";
import test from "node:test";

import { shouldRunCamera } from "../lib/camera-lifecycle";

test("camera only runs while its screen is focused and the app is active", () => {
  assert.equal(shouldRunCamera({ enabled: true, screenFocused: true, appState: "active" }), true);
  assert.equal(shouldRunCamera({ enabled: true, screenFocused: false, appState: "active" }), false);
  assert.equal(shouldRunCamera({ enabled: true, screenFocused: true, appState: "background" }), false);
  assert.equal(shouldRunCamera({ enabled: true, screenFocused: true, appState: "inactive" }), false);
  assert.equal(shouldRunCamera({ enabled: false, screenFocused: true, appState: "active" }), false);
});
