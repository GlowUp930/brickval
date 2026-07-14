import assert from "node:assert/strict";
import test from "node:test";

import { resolveMarketSnapshot } from "../src/lib/market-snapshot-store";

test("a fresh market snapshot is returned without waiting for live pricing", async () => {
  let livePricingRequested = false;
  const result = await resolveMarketSnapshot("sw0001", {
    now: () => new Date("2026-07-14T12:00:00.000Z"),
    read: async () => ({
      payload: { name: "Battle Droid", pricing: { used_sold_avg_usd: 4.25 } },
      updatedAt: "2026-07-14T06:00:00.000Z",
    }),
    fetchLive: async () => {
      livePricingRequested = true;
      return { name: "Unexpected" };
    },
    write: async () => {},
    refreshInBackground: () => {},
  });

  assert.equal(result.pricingStatus, "fresh");
  assert.equal(result.pricingUpdatedAt, "2026-07-14T06:00:00.000Z");
  assert.equal(result.payload.name, "Battle Droid");
  assert.equal(livePricingRequested, false);
});

test("a one-day-old snapshot is returned immediately and refreshed in the background", async () => {
  const backgroundTasks: Array<() => Promise<void>> = [];
  let writtenName = "";
  const result = await resolveMarketSnapshot("sw0001", {
    now: () => new Date("2026-07-14T12:00:00.000Z"),
    read: async () => ({
      payload: { name: "Stored Battle Droid" },
      updatedAt: "2026-07-12T12:00:00.000Z",
    }),
    fetchLive: async () => ({ name: "Updated Battle Droid" }),
    write: async (_itemId, snapshot) => {
      writtenName = snapshot.payload.name;
    },
    refreshInBackground: (task) => {
      backgroundTasks.push(task);
    },
  });

  assert.equal(result.pricingStatus, "refreshing");
  assert.equal(result.payload.name, "Stored Battle Droid");
  assert.equal(backgroundTasks.length, 1);
  await backgroundTasks[0]();
  assert.equal(writtenName, "Updated Battle Droid");
});

test("a snapshot older than seven days waits for live pricing and stores it", async () => {
  let savedAt = "";
  const result = await resolveMarketSnapshot("sw0001", {
    now: () => new Date("2026-07-14T12:00:00.000Z"),
    read: async () => ({
      payload: { name: "Outdated Battle Droid" },
      updatedAt: "2026-07-01T12:00:00.000Z",
    }),
    fetchLive: async () => ({ name: "Current Battle Droid" }),
    write: async (_itemId, snapshot) => {
      savedAt = snapshot.updatedAt;
    },
    refreshInBackground: () => {
      assert.fail("expired snapshots must not schedule a background-only refresh");
    },
  });

  assert.equal(result.pricingStatus, "fetched");
  assert.equal(result.payload.name, "Current Battle Droid");
  assert.equal(savedAt, "2026-07-14T12:00:00.000Z");
});
