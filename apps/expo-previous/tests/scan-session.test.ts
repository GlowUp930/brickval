import assert from "node:assert/strict";
import test from "node:test";

import { runMinifigScanSession, type ScanSessionDependencies } from "../lib/scan-session";
import type { IdentificationResult, LookupDetailResult } from "../lib/api";

const identification = (ids: string[]): IdentificationResult => ({
  set_number: ids[0] ?? null,
  confidence: 0.95,
  candidates: [],
  detections: ids.map((id, index) => ({ id, item_type: "minifig", score: 0.95 - index * 0.01 })),
});

const lookup = (id: string): Extract<LookupDetailResult, { item_type: "minifig" }> => ({
  set_number: id,
  item_type: "minifig",
  name: id,
  theme: "Test",
  pieces: null,
  image_url: null,
  market_history: [],
  pricing: {
    hero_new_avg_usd: 5,
    rrp_usd: null,
    gain_pct: null,
    bricklink_new_qty: 1,
    data_source: "sold",
    used_sold_avg_usd: 4,
    used_sold_min_usd: 4,
    used_sold_max_usd: 4,
    used_sold_qty: 1,
    used_stock_avg_usd: null,
    used_stock_qty: 0,
    new_sold_avg_usd: 5,
    new_sold_min_usd: 5,
    new_sold_max_usd: 5,
    new_sold_qty: 1,
    new_stock_avg_usd: null,
    new_stock_qty: 0,
    sold_details: [],
    stock_details: [],
    sold_new_details: [],
    stock_new_details: [],
  },
  fig_info: { fig_number: id, year_released: 2020 },
});

function dependencies(
  overrides: Partial<ScanSessionDependencies>
): ScanSessionDependencies {
  return {
    prepareAccess: async () => ({ allowed: true, hasToken: true }),
    identify: async () => identification([]),
    bulkLookup: async () => [],
    lookup: async (id) => lookup(id),
    now: () => 10,
    ...overrides,
  };
}

test("single Scan Session checks access once and returns a priced match", async () => {
  let accessCalls = 0;
  const outcome = await runMinifigScanSession("file://scan.jpg", "single", dependencies({
    prepareAccess: async () => {
      accessCalls += 1;
      return { allowed: true, hasToken: false };
    },
    identify: async () => identification(["sw0001"]),
    lookup: async (id) => lookup(id),
    now: () => 10,
  }));

  assert.equal(outcome.kind, "single-match");
  assert.equal(accessCalls, 1);
  if (outcome.kind === "single-match") assert.equal(outcome.result.set_number, "sw0001");
});

test("single Scan Session uses the combined identify-and-price request when available", async () => {
  let legacyIdentifyCalled = false;
  let legacyLookupCalled = false;
  const outcome = await runMinifigScanSession("file://scan.jpg", "single", dependencies({
    scanSingle: async () => ({
      status: "matched",
      identification: { id: "sw0001", item_type: "minifig", score: 0.95 },
      result: lookup("sw0001"),
    }),
    identify: async () => {
      legacyIdentifyCalled = true;
      return identification([]);
    },
    lookup: async (id) => {
      legacyLookupCalled = true;
      return lookup(id);
    },
  }));

  assert.equal(outcome.kind, "single-match");
  assert.equal(legacyIdentifyCalled, false);
  assert.equal(legacyLookupCalled, false);
});

test("bulk Scan Session prices all detections in one batch", async () => {
  let batchIds: string[] = [];
  const outcome = await runMinifigScanSession("file://scan.jpg", "bulk", dependencies({
    prepareAccess: async () => ({ allowed: true, hasToken: true }),
    identify: async () => identification(["sw0001", "sw0002", "sw0003"]),
    bulkLookup: async (ids) => {
      batchIds = ids;
      return ids.map((id) => ({ figNumber: id, result: lookup(id), error: null }));
    },
    now: () => 10,
  }));

  assert.equal(outcome.kind, "bulk-results");
  assert.deepEqual(batchIds, ["sw0001", "sw0002", "sw0003"]);
  if (outcome.kind === "bulk-results") assert.equal(outcome.results.length, 3);
});

test("bulk Scan Session falls back to parallel individual lookups", async () => {
  const requested: string[] = [];
  const outcome = await runMinifigScanSession("file://scan.jpg", "bulk", dependencies({
    prepareAccess: async () => ({ allowed: true, hasToken: true }),
    identify: async () => identification(["sw0001", "sw0002"]),
    bulkLookup: async () => {
      throw new Error("batch unavailable");
    },
    lookup: async (id) => {
      requested.push(id);
      return lookup(id);
    },
    now: () => 10,
  }));

  assert.equal(outcome.kind, "bulk-results");
  assert.deepEqual(requested.sort(), ["sw0001", "sw0002"]);
});
