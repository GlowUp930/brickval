import assert from "node:assert/strict";
import test from "node:test";

import { BrickLinkProviderError } from "../src/lib/bricklink";
import {
  buildMinifigLookupPayload,
  identityOnlyMinifigLookupPayload,
  minifigLookupPayloadFromMarketData,
} from "../src/lib/minifig-lookup";

test("identity-only minifigure payload has no invented price or history", () => {
  const payload = identityOnlyMinifigLookupPayload("sw0001");
  assert.equal(payload.figInfo.fig_number, "sw0001");
  assert.equal(payload.pricing_availability, "unavailable");
  assert.equal(payload.pricing_resolution, "identity_only");
  assert.equal(payload.pricing.used_sold_avg_usd, null);
  assert.deepEqual(payload.pricing.sold_details, []);
  assert.deepEqual(payload.pricing.sold_new_details, []);
});

test("temporary BrickLink failures remain typed for snapshot fallback", async () => {
  await assert.rejects(
    () => buildMinifigLookupPayload("sw0001", async () => {
      throw new BrickLinkProviderError("temporary");
    }),
    (error: unknown) => error instanceof BrickLinkProviderError && error.kind === "temporary",
  );
});

test("configuration failures are never converted into a not-found result", async () => {
  await assert.rejects(
    () => buildMinifigLookupPayload("sw0001", async () => {
      throw new BrickLinkProviderError("configuration");
    }),
    (error: unknown) => error instanceof BrickLinkProviderError && error.kind === "configuration",
  );
});

test("a successful minifigure lookup marks its pricing as available", async () => {
  const payload = await buildMinifigLookupPayload("sw0001", async () => ({
    item: {
      no: "sw0001",
      name: "Battle Droid",
      type: "MINIFIG",
      image_url: "https://img.bricklink.com/ML/sw0001.jpg",
      thumbnail_url: "https://img.bricklink.com/ML/sw0001.jpg",
      weight: "1",
      dim_x: "1",
      dim_y: "1",
      dim_z: "1",
      year_released: 2000,
      is_obsolete: false,
      categoryID: 1,
    },
    sold_used: null,
    stock_used: {
      item: { no: "sw0001", type: "MINIFIG" },
      new_or_used: "U",
      currency_code: "USD",
      min_price: "1.00",
      max_price: "2.00",
      avg_price: "1.50",
      qty_avg_price: "1.50",
      unit_quantity: 2,
      total_quantity: 2,
      price_detail: [],
    },
    sold_new: null,
    stock_new: null,
  }));

  assert.equal(payload?.pricing_availability, "available");
  assert.equal(payload?.pricing_resolution, "live");
  assert.equal(payload?.figInfo.name, "Battle Droid");
});

test("a previously cached raw BrickLink response can be rehydrated without a provider call", () => {
  const payload = minifigLookupPayloadFromMarketData("sw0001", {
    item: {
      no: "sw0001",
      name: "Battle Droid",
      type: "MINIFIG",
      image_url: "https://img.bricklink.com/ML/sw0001.jpg",
      thumbnail_url: "https://img.bricklink.com/ML/sw0001.jpg",
      weight: "1",
      dim_x: "1",
      dim_y: "1",
      dim_z: "1",
      year_released: 2000,
      is_obsolete: false,
      categoryID: 1,
    },
    sold_used: {
      item: { no: "sw0001", type: "MINIFIG" },
      new_or_used: "U",
      currency_code: "USD",
      min_price: "2.00",
      max_price: "4.00",
      avg_price: "3.00",
      qty_avg_price: "3.25",
      unit_quantity: 4,
      total_quantity: 4,
      price_detail: [{ quantity: 1, unit_price: "3.25", date_ordered: "2026-09-10" }],
    },
    stock_used: null,
    sold_new: null,
    stock_new: null,
  });

  assert.equal(payload?.figInfo.fig_number, "sw0001");
  assert.equal(payload?.pricing.used_sold_avg_usd, 3.25);
  assert.equal(payload?.pricing.sold_details[0]?.date, "2026-09-10");
});
