import assert from "node:assert/strict";
import test from "node:test";
import { buildMarketSnapshot } from "../lib/market-snapshot";
import type { SetLookupDetailResult } from "../lib/api";

const baseSetResult = {
  set_number: "75192",
  item_type: "set",
  name: "Millennium Falcon",
  theme: "Star Wars",
  pieces: 7541,
  image_url: null,
  market_history: [],
  set_info: {
    year_released: 2017,
    is_obsolete: false,
  },
  pricing: {
    hero_new_avg_usd: 812,
    rrp_usd: 849.99,
    gain_pct: -4.47,
    bricklink_new_qty: 18,
    data_source: "sold",
    exchange_rate_stale: false,
    ebay_new_sales: [],
    ebay_used_sales: [],
    ebay_new_avg_usd: null,
    ebay_used_avg_usd: null,
    bricklink_new_avg_usd: 812,
    bricklink_new_min_usd: 760,
    bricklink_new_max_usd: 880,
    bricklink_used_avg_usd: null,
    bricklink_used_min_usd: null,
    bricklink_used_max_usd: null,
    bricklink_used_qty: null,
    bricklink_stock_new_avg_usd: null,
    bricklink_stock_new_qty: null,
    bricklink_stock_used_avg_usd: null,
    bricklink_stock_used_qty: null,
    bricklink_sold_new_details: [],
    bricklink_sold_used_details: [],
    bricklink_stock_new_details: [],
    bricklink_stock_used_details: [],
  },
} satisfies SetLookupDetailResult;

test("buildMarketSnapshot marks enough BrickLink sold set data as high confidence", () => {
  const snapshot = buildMarketSnapshot(baseSetResult, "new_sealed", "2026-06-25T01:02:03.000Z");

  assert.deepEqual(snapshot, {
    item_type: "set",
    item_id: "75192",
    condition: "new_sealed",
    price_usd: 812,
    source_name: "BrickLink",
    source_type: "sold",
    confidence: "high",
    count: 18,
    updated_at: "2026-06-25T01:02:03.000Z",
  });
});

test("buildMarketSnapshot falls back to eBay sold set data when BrickLink sold is missing", () => {
  const result: SetLookupDetailResult = {
    ...baseSetResult,
    pricing: {
      ...baseSetResult.pricing,
      bricklink_new_avg_usd: null,
      bricklink_new_qty: null,
      ebay_new_avg_usd: 795,
      ebay_new_sales: [
        {
          title: "LEGO Star Wars Millennium Falcon 75192",
          price_usd: 795,
          sold_date: "2026-06-01",
          condition: "New",
          item_url: "https://example.com/1",
        },
        {
          title: "LEGO 75192 sealed",
          price_usd: 805,
          sold_date: "2026-06-03",
          condition: "New",
          item_url: "https://example.com/2",
        },
      ],
    },
  };

  const snapshot = buildMarketSnapshot(result, "new_sealed", "2026-06-25T01:02:03.000Z");

  assert.equal(snapshot.price_usd, 795);
  assert.equal(snapshot.source_name, "eBay");
  assert.equal(snapshot.source_type, "sold");
  assert.equal(snapshot.confidence, "limited");
  assert.equal(snapshot.count, 2);
});

test("buildMarketSnapshot treats listing-only set data as guide confidence", () => {
  const result: SetLookupDetailResult = {
    ...baseSetResult,
    pricing: {
      ...baseSetResult.pricing,
      bricklink_new_avg_usd: null,
      bricklink_new_qty: null,
      ebay_new_avg_usd: null,
      bricklink_stock_new_avg_usd: 840,
      bricklink_stock_new_qty: 9,
    },
  };

  const snapshot = buildMarketSnapshot(result, "new_sealed", "2026-06-25T01:02:03.000Z");

  assert.equal(snapshot.price_usd, 840);
  assert.equal(snapshot.source_name, "BrickLink");
  assert.equal(snapshot.source_type, "listing");
  assert.equal(snapshot.confidence, "guide");
  assert.equal(snapshot.count, 9);
});

test("buildMarketSnapshot returns unavailable when no price exists", () => {
  const result: SetLookupDetailResult = {
    ...baseSetResult,
    pricing: {
      ...baseSetResult.pricing,
      hero_new_avg_usd: null,
      bricklink_new_avg_usd: null,
      bricklink_new_qty: null,
      ebay_new_avg_usd: null,
      bricklink_stock_new_avg_usd: null,
      bricklink_stock_new_qty: null,
    },
  };

  const snapshot = buildMarketSnapshot(result, "new_sealed", "2026-06-25T01:02:03.000Z");

  assert.equal(snapshot.price_usd, null);
  assert.equal(snapshot.source_name, "Market data");
  assert.equal(snapshot.source_type, "none");
  assert.equal(snapshot.confidence, "unavailable");
  assert.equal(snapshot.count, null);
});
