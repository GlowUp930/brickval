import assert from "node:assert/strict";
import test from "node:test";

import {
  MonetizationStatus,
  reconcileDeniedProStatus,
} from "../src/lib/scan-gate";
import { hasActiveProEntitlement } from "../src/lib/revenuecat-entitlement";

const freeStatus: MonetizationStatus = {
  policy: {
    version: 4,
    accessExperiment: { enabled: false, hardPaywallPercent: 50, trialDays: 7 },
    gates: {
      singleDaily: true,
      bulkRepeat: true,
      collectionCapacity: true,
      marketHistory: false,
      appearance: true,
      offerCodes: true,
    },
    limits: {
      singleScansPerDay: 3,
      introductoryBulkScans: 1,
      collectionUniqueItems: 10,
    },
    notifications: {
      enabled: true,
      scanReset: true,
      trialEnding: true,
      accountAction: true,
    },
  },
  usage: {
    isPro: false,
    singleScan: { used: 3, limit: 3, remaining: 0, resetsAt: null },
    bulkScan: { used: 1, limit: 1, remaining: 0, resetsAt: null },
  },
};

test("an active RevenueCat entitlement repairs a stale free bulk decision", async () => {
  const persisted: Array<[string, boolean]> = [];

  const status = await reconcileDeniedProStatus(
    "user_123",
    freeStatus,
    async (userID) => {
      assert.equal(userID, "user_123");
      return true;
    },
    async (userID, isPro) => {
      persisted.push([userID, isPro]);
    }
  );

  assert.equal(status.usage.isPro, true);
  assert.equal(status.usage.bulkScan.remaining, 0);
  assert.deepEqual(persisted, [["user_123", true]]);
});

test("an unavailable RevenueCat check does not unlock a free account", async () => {
  const persisted: Array<[string, boolean]> = [];

  const status = await reconcileDeniedProStatus(
    "user_123",
    freeStatus,
    async () => null,
    async (userID, isPro) => {
      persisted.push([userID, isPro]);
    }
  );

  assert.equal(status.usage.isPro, false);
  assert.deepEqual(persisted, []);
});

test("RevenueCat grace-period access remains active until the grace period expires", () => {
  const now = new Date("2026-08-15T00:00:00.000Z");

  assert.equal(
    hasActiveProEntitlement(
      {
        subscriber: {
          entitlements: {
            pro: {
              expires_date: "2026-08-14T00:00:00.000Z",
              grace_period_expires_date: "2026-08-16T00:00:00.000Z",
            },
          },
        },
      },
      now
    ),
    true
  );
  assert.equal(
    hasActiveProEntitlement(
      {
        subscriber: {
          entitlements: {
            pro: { expires_date: "2026-08-14T00:00:00.000Z" },
          },
        },
      },
      now
    ),
    false
  );
});
