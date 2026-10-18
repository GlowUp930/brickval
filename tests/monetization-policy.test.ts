import assert from "node:assert/strict";
import test from "node:test";

import { getMonetizationPolicy } from "../src/lib/monetization-policy";

const keys = [
  "BRICKVALUE_RETENTION_NOTIFICATIONS_ENABLED",
  "BRICKVALUE_SINGLE_SCAN_GATE_ENABLED",
  "BRICKVALUE_BULK_GATE_ENABLED",
  "BRICKVALUE_COLLECTION_GATE_ENABLED",
  "BRICKVALUE_MARKET_HISTORY_GATE_ENABLED",
  "BRICKVALUE_OFFER_CODES_ENABLED",
  "BRICKVALUE_LOCKED_BULK_PREVIEW_ENABLED",
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

test("current defaults require subscription without free access", () => {
  withCleanEnvironment(() => {
    const policy = getMonetizationPolicy();
    assert.equal(policy.version, 7);
    assert.equal(policy.accessExperiment.enabled, true);
    assert.equal(policy.accessExperiment.hardPaywallPercent, 100);
    assert.equal(policy.notifications.scanReset, false);
    assert.equal(policy.gates.singleDaily, true);
    assert.equal(policy.gates.bulkRepeat, true);
    assert.equal(policy.gates.collectionCapacity, true);
    assert.equal(policy.gates.marketHistory, false);
    assert.equal(policy.gates.appearance, true);
    assert.equal(policy.gates.offerCodes, true);
    assert.equal(policy.lockedBulkPreview, false);
    assert.equal(policy.limits.singleScansPerDay, 0);
    assert.equal(policy.limits.introductoryBulkScans, 0);
    assert.equal(policy.limits.collectionUniqueItems, 0);
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

test("locked bulk previews follow their remote kill switch", () => {
  withCleanEnvironment(() => {
    process.env.BRICKVALUE_LOCKED_BULK_PREVIEW_ENABLED = "false";
    const policy = getMonetizationPolicy();
    assert.equal(policy.lockedBulkPreview, false);
  });
});

test("legacy overrides cannot reopen free access", () => {
  withCleanEnvironment(() => {
    process.env.BRICKVALUE_SINGLE_SCAN_GATE_ENABLED = "false";
    process.env.BRICKVALUE_MARKET_HISTORY_GATE_ENABLED = "1";
    process.env.BRICKVALUE_FREE_SINGLE_SCANS_PER_DAY = "5";
    const policy = getMonetizationPolicy();
    assert.equal(policy.gates.singleDaily, true);
    assert.equal(policy.gates.marketHistory, true);
    assert.equal(policy.limits.singleScansPerDay, 0);
  });
});

test("invalid limits fall back to safe defaults", () => {
  withCleanEnvironment(() => {
    process.env.BRICKVALUE_FREE_SINGLE_SCANS_PER_DAY = "0";
    process.env.BRICKVALUE_FREE_COLLECTION_ITEMS = "not-a-number";
    const policy = getMonetizationPolicy();
    assert.equal(policy.limits.singleScansPerDay, 0);
    assert.equal(policy.limits.collectionUniqueItems, 0);
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


test("retention sequence is disabled by default and separately controlled", () => {
  withCleanEnvironment(() => {
    assert.equal(getMonetizationPolicy().notifications.retention, false);
    process.env.BRICKVALUE_RETENTION_NOTIFICATIONS_ENABLED = "true";
    assert.equal(getMonetizationPolicy().notifications.retention, true);
  });
});

test("old experiment and preview overrides cannot restore the soft funnel", () => {
  const names = ["BRICKVALUE_HARD_PAYWALL_EXPERIMENT_ENABLED", "BRICKVALUE_HARD_PAYWALL_PERCENT", "BRICKVALUE_LOCKED_BULK_PREVIEW_ENABLED"];
  const previous = names.map(name => process.env[name]);
  try {
    process.env[names[0]] = "false";
    process.env[names[1]] = "0";
    process.env[names[2]] = "true";
    const policy = getMonetizationPolicy();
    assert.equal(policy.accessExperiment.enabled, true);
    assert.equal(policy.accessExperiment.hardPaywallPercent, 100);
    assert.equal(policy.lockedBulkPreview, false);
  } finally {
    names.forEach((name, index) => {
      if (previous[index] === undefined) delete process.env[name];
      else process.env[name] = previous[index];
    });
  }
});
