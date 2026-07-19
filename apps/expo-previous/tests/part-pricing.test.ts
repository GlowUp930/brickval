import assert from "node:assert/strict";
import test from "node:test";
import { getConditionMarketHistory, getConditionMarketValueUsd, type LookupLikeResult } from "../lib/lookup-market";

const result = {
  set_number: "3001",
  item_type: "part",
  name: "Brick 2 x 4",
  theme: "Part · Red",
  pieces: null,
  image_url: null,
  market_history: [],
  part_info: {
    part_number: "3001",
    year_released: 1958,
    color_id: 5,
    color_name: "Red",
  },
  pricing: {
    hero_new_avg_usd: 0.24,
    rrp_usd: null,
    gain_pct: null,
    bricklink_new_qty: 12,
    data_source: "sold",
    new_sold_avg_usd: 0.24,
    new_sold_min_usd: 0.21,
    new_sold_max_usd: 0.28,
    new_sold_qty: 12,
    new_stock_avg_usd: 0.29,
    new_stock_qty: 30,
    used_sold_avg_usd: null,
    used_sold_min_usd: null,
    used_sold_max_usd: null,
    used_sold_qty: null,
    used_stock_avg_usd: 0.18,
    used_stock_qty: 8,
    sold_details: [{ price_usd: 0.24, quantity: 4, date: "2026-04-20", country: "US" }],
    stock_details: [{ price_usd: 0.29, quantity: 10, country: "CA" }],
    sold_used_details: [],
    stock_used_details: [{ price_usd: 0.18, quantity: 3, country: "GB" }],
  },
} as LookupLikeResult;

test("getConditionMarketValueUsd prefers sold then stock for parts", () => {
  assert.equal(getConditionMarketValueUsd(result, "new_sealed"), 0.24);
  assert.equal(getConditionMarketValueUsd(result, "used"), 0.18);
});

test("getConditionMarketHistory returns sold rows for parts and ignores stock rows", () => {
  assert.deepEqual(getConditionMarketHistory(result, "new_sealed"), [
    { date: "2026-04-20", price_usd: 0.24, source: "bricklink" },
  ]);
});
