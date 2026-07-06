import assert from "node:assert/strict";
import test from "node:test";

import { buildMarketRows, normalizeMarketRows } from "../lib/market-rows";

test("buildMarketRows returns display rows for minifigure sold and listing details", () => {
  const rows = buildMarketRows({
    item_type: "minifig",
    set_number: "sw0001",
    name: "Battle Droid",
    theme: "Star Wars",
    pieces: null,
    image_url: null,
    market_history: [],
    fig_info: {
      fig_number: "sw0001",
      year_released: null,
    },
    pricing: {
      hero_new_avg_usd: 7,
      rrp_usd: null,
      gain_pct: null,
      bricklink_new_qty: 1,
      data_source: "sold",
      used_sold_avg_usd: 5.5,
      used_sold_min_usd: 5.5,
      used_sold_max_usd: 5.5,
      used_sold_qty: 2,
      used_stock_avg_usd: 6.25,
      used_stock_qty: 4,
      new_sold_avg_usd: 7,
      new_sold_min_usd: 7,
      new_sold_max_usd: 7,
      new_sold_qty: 1,
      new_stock_avg_usd: 8,
      new_stock_qty: 2,
      sold_details: [{ date: "2026-06-01", price_usd: 5.5, quantity: 1, country: "US" }],
      stock_details: [{ price_usd: 6.25, quantity: 4, country: "AU" }],
      sold_new_details: [{ date: "2026-06-02T12:00:00.000Z", price_usd: 7, quantity: 1, country: "GB" }],
      stock_new_details: [{ price_usd: 8, quantity: 2, country: "US" }],
    },
  });

  assert.deepEqual(rows, [
    { id: "fig-sold-0", label: "BrickLink sold", meta: "Jun 2 · GB", priceUsd: 7 },
    { id: "fig-sold-1", label: "BrickLink sold", meta: "Jun 1 · US", priceUsd: 5.5 },
    { id: "fig-stock-0", label: "BrickLink listing", meta: "US · qty 2", priceUsd: 8 },
    { id: "fig-stock-1", label: "BrickLink listing", meta: "AU · qty 4", priceUsd: 6.25 },
  ]);
});

test("normalizeMarketRows keeps only rows with positive prices", () => {
  assert.deepEqual(
    normalizeMarketRows([
      { id: "valid", label: "BrickLink sold", meta: "Jun 1", priceUsd: 5.5 },
      { id: "zero", label: "Bad", meta: "", priceUsd: 0 },
      { id: "missing", label: "Bad", meta: "" },
    ]),
    [{ id: "valid", label: "BrickLink sold", meta: "Jun 1", priceUsd: 5.5 }]
  );
});
