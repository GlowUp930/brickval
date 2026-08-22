import assert from "node:assert/strict";
import test from "node:test";

import { getMonetizationPolicy } from "../src/lib/monetization-policy";

const keys = [
  "BRICKVALUE_SINGLE_SCAN_GATE_ENABLED",
  "BRICKVALUE_BULK_GATE_ENABLED",
  "BRICKVALUE_COLLECTION_GATE_ENABLED",
  "BRICKVALUE_MARKET_HISTORY_GATE_ENABLED",
  "BRICKVALUE_OFFER_CODES_ENABLED",
  "BRICKVALUE_FREE_SINGLE_SCANS_PER_DAY",
  "BRICKVALUE_FREE_BULK_SCANS",
  "BRICKVALUE_FREE_COLLECTION_ITEMS",
  "BRICKVALUE_MINIMUM_IOS_BUILD",
  "BRICKVALUE_IOS_UPDATE_URL",
] as const;

function withCleanEnvironment(action: () => void) {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  try {
    action();
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("current defaults gate daily scans, repeat bulk, and ten unique collection items", () => {
  withCleanEnvironment(() => {
    const policy = getMonetizationPolicy();
    assert.equal(policy.version, 4);
    assert.equal(policy.gates.singleDaily, true);
    assert.equal(policy.gates.bulkRepeat, true);
    assert.equal(policy.gates.collectionCapacity, true);
    assert.equal(policy.gates.marketHistory, false);
    assert.equal(policy.gates.appearance, true);
    assert.equal(policy.gates.offerCodes, true);
    assert.equal(policy.limits.singleScansPerDay, 3);
    assert.equal(policy.limits.introductoryBulkScans, 1);
    assert.equal(policy.limits.collectionUniqueItems, 10);
    assert.equal(policy.minimumAppBuild, null);
    assert.equal(policy.appUpdateURL, "https://apps.apple.com/au/app/brickvalue/id6771715475");
  });
});

test("offer code redemption follows its remote kill switch", () => {
  withCleanEnvironment(() => {
    process.env.BRICKVALUE_OFFER_CODES_ENABLED = "false";
    const policy = getMonetizationPolicy();
    assert.equal(policy.gates.offerCodes, false);
  });
});

test("valid environment overrides can disable daily scans and activate later experiments", () => {
  withCleanEnvironment(() => {
    process.env.BRICKVALUE_SINGLE_SCAN_GATE_ENABLED = "false";
    process.env.BRICKVALUE_MARKET_HISTORY_GATE_ENABLED = "1";
    process.env.BRICKVALUE_FREE_SINGLE_SCANS_PER_DAY = "5";
    const policy = getMonetizationPolicy();
    assert.equal(policy.gates.singleDaily, false);
    assert.equal(policy.gates.marketHistory, true);
    assert.equal(policy.limits.singleScansPerDay, 5);
  });
});

test("invalid limits fall back to safe defaults", () => {
  withCleanEnvironment(() => {
    process.env.BRICKVALUE_FREE_SINGLE_SCANS_PER_DAY = "0";
    process.env.BRICKVALUE_FREE_COLLECTION_ITEMS = "not-a-number";
    const policy = getMonetizationPolicy();
    assert.equal(policy.limits.singleScansPerDay, 3);
    assert.equal(policy.limits.collectionUniqueItems, 10);
  });
});

test("minimum iOS build can be enabled remotely", () => {
  withCleanEnvironment(() => {
    process.env.BRICKVALUE_MINIMUM_IOS_BUILD = "142";
    process.env.BRICKVALUE_IOS_UPDATE_URL = "https://example.com/update";
    const policy = getMonetizationPolicy();
    assert.equal(policy.minimumAppBuild, 142);
    assert.equal(policy.appUpdateURL, "https://example.com/update");
  });
});
