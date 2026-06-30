import assert from "node:assert/strict";
import test from "node:test";

import {
  MINIFIG_BATCH_LIMIT,
  buildMinifigLookupPayload,
  sanitizeBulkMinifigNumbers,
} from "../../src/lib/minifig-lookup";

test("sanitizeBulkMinifigNumbers dedupes, normalizes, and caps minifigure ids for batch pricing", () => {
  const ids = sanitizeBulkMinifigNumbers([
    " SH0329 ",
    "sh0329",
    "fig-sh0115",
    "coltlbm16",
    "sw0001",
    "sw0002",
    "sw0003",
    "sw0004",
    "sw0005",
    "sw0006",
    "sw0007",
    "sw0008",
    "sw0009",
    "sw0010",
  ]);

  assert.equal(ids.length, MINIFIG_BATCH_LIMIT);
  assert.deepEqual(ids.slice(0, 3), ["sh0329", "figsh0115", "coltlbm16"]);
  assert.equal(ids.includes("sw0010"), false);
});

test("buildMinifigLookupPayload returns display-ready minifigure pricing from market data", async () => {
  const payload = await buildMinifigLookupPayload("sh0329", async () => ({
    item: {
      no: "sh0329",
      name: "Batman &amp; Utility Belt",
      type: "MINIFIG",
      image_url: "https://img.bricklink.com/ItemImage/MN/0/sh0329.png",
      thumbnail_url: "https://img.bricklink.com/ML/sh0329.jpg",
      weight: "0",
      dim_x: "0",
      dim_y: "0",
      dim_z: "0",
      year_released: 2017,
      is_obsolete: false,
      categoryID: 768,
    },
    sold_used: {
      item: { no: "sh0329", type: "MINIFIG" },
      new_or_used: "U",
      currency_code: "USD",
      min_price: "7.0000",
      max_price: "12.0000",
      avg_price: "9.0000",
      qty_avg_price: "9.5000",
      unit_quantity: 4,
      total_quantity: 4,
      price_detail: [
        { unit_price: "9.5000", quantity: 1, date_ordered: "2026-06-20", seller_country_code: "US" },
      ],
    },
    stock_used: null,
    sold_new: null,
    stock_new: null,
  }));

  assert.ok(payload);
  assert.equal(payload.figInfo.name, "Batman & Utility Belt");
  assert.equal(payload.figInfo.fig_number, "sh0329");
  assert.equal(payload.pricing.used_sold_avg_usd, 9.5);
  assert.equal(payload.pricing.used_sold_qty, 4);
  assert.equal(payload.pricing.sold_details[0].price_usd, 9.5);
});
