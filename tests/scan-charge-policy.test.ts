import assert from "node:assert/strict";
import test from "node:test";

import { shouldChargeScan } from "../src/lib/scan-charge-policy";

test("charges minifig identify once and does not charge bulk minifig lookup again", () => {
  assert.equal(shouldChargeScan("identify", "minifig"), true);
  assert.equal(shouldChargeScan("bulk-lookup", "minifig"), false);
});

test("keeps set lookup and bulk set lookup chargeable", () => {
  assert.equal(shouldChargeScan("identify", "set"), false);
  assert.equal(shouldChargeScan("lookup", "set"), true);
  assert.equal(shouldChargeScan("bulk-lookup", "set"), true);
});

test("does not charge part or minifig market lookup because identify owns those scan charges", () => {
  assert.equal(shouldChargeScan("lookup", "part"), false);
  assert.equal(shouldChargeScan("lookup", "minifig"), false);
});
