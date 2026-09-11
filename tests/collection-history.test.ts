import assert from "node:assert/strict";
import test from "node:test";
import { collectionHistory, historyKey, historySales, parseHistoryItems, type HistoryItem } from "../src/lib/collection-history";
import type { BrickLinkPriceGuide } from "../src/lib/bricklink";

test("history validates bounded batches, canonical set IDs and part colours", () => {
  assert.deepEqual(parseHistoryItems({ items: [{ identifier: "21367-1", item_type: "set" }, { identifier: "21367", item_type: "set" }] }), [{ identifier: "21367", item_type: "set" }]);
  assert.equal(parseHistoryItems({ items: Array(21).fill({ identifier: "21367", item_type: "set" }) }), null);
  assert.equal(parseHistoryItems({ items: [{ identifier: "3001", item_type: "part" }] }), null);
  assert.equal(parseHistoryItems({ items: [{ identifier: "../secret", item_type: "minifig" }] }), null);
});

test("only valid dated USD sales cross the public boundary", () => {
  const guide: BrickLinkPriceGuide = { item: { no: "21367", type: "SET" }, new_or_used: "N", currency_code: "USD", min_price: "10", max_price: "20", avg_price: "15", qty_avg_price: "15", unit_quantity: 2, total_quantity: 2,
    price_detail: [
      { unit_price: "20", quantity: 2, date_ordered: "2026-09-02T05:00:00Z", buyer_country_code: "AU", seller_country_code: "US" },
      { unit_price: "10", quantity: 1, date_ordered: "2026-09-01T00:00:00Z" },
      { unit_price: "99", quantity: 1 },
      { unit_price: "-1", quantity: 1, date_ordered: "2026-09-01T00:00:00Z" },
      { unit_price: "99", quantity: 1, date_ordered: "2027-09-01T00:00:00Z" },
    ] };
  const result = historySales(guide, new Date("2026-09-08T00:00:00Z"));
  assert.deepEqual(result, [
    { date: "2026-09-01T00:00:00.000Z", price_usd: 10, quantity: 1 },
    { date: "2026-09-02T05:00:00.000Z", price_usd: 20, quantity: 2, seller_country_code: "US" },
  ]);
  assert.deepEqual(historySales({ ...guide, currency_code: "EUR" }, new Date()), []);
});

test("seller countries are normalized without exposing invalid provider values", () => {
  const guide: BrickLinkPriceGuide = {
    item: { no: "21367", type: "SET" }, new_or_used: "U", currency_code: "USD",
    min_price: "1", max_price: "3", avg_price: "2", qty_avg_price: "2", unit_quantity: 3, total_quantity: 3,
    price_detail: [
      { unit_price: "1", quantity: 1, date_ordered: "2026-09-01", seller_country_code: " ca " },
      { unit_price: "2", quantity: 1, date_ordered: "2026-09-02", seller_country_code: "USA" },
      { unit_price: "3", quantity: 1, date_ordered: "2026-09-03", seller_country_code: "" },
    ],
  };
  assert.deepEqual(historySales(guide, new Date("2026-09-08T00:00:00Z")), [
    { date: "2026-09-01T00:00:00.000Z", price_usd: 1, quantity: 1, seller_country_code: "CA" },
    { date: "2026-09-02T00:00:00.000Z", price_usd: 2, quantity: 1 },
    { date: "2026-09-03T00:00:00.000Z", price_usd: 3, quantity: 1 },
  ]);
});

test("active listing rows are exposed as current asking observations when requested", () => {
  const guide: BrickLinkPriceGuide = {
    item: { no: "21367", type: "SET" }, new_or_used: "U", currency_code: "USD",
    min_price: "10", max_price: "20", avg_price: "15", qty_avg_price: "14", unit_quantity: 3, total_quantity: 3,
    price_detail: [{ unit_price: "10", quantity: 2, seller_country_code: " au " }, { unit_price: "20", quantity: 1 }],
  };
  const now = new Date("2026-09-08T00:00:00Z");
  assert.deepEqual(historySales(guide, now, "listing"), [
    { date: now.toISOString(), price_usd: 10, quantity: 2, source: "listing", seller_country_code: "AU" },
    { date: now.toISOString(), price_usd: 20, quantity: 1, source: "listing" },
  ]);
});

test("history cache keys use the country-aware response version", () => {
  assert.equal(historyKey({ identifier: "21367", item_type: "set" }), "collection-history:v3:set:21367:none");
});

test("batch concurrency is bounded and failed items do not discard successes", async () => {
  let running = 0, maximum = 0;
  const items: HistoryItem[] = Array.from({ length: 20 }, (_, i) => ({ identifier: String(10000 + i), item_type: "set" }));
  const results = await collectionHistory(items, async item => {
    running++; maximum = Math.max(maximum, running);
    await new Promise(resolve => setTimeout(resolve, 2));
    running--;
    if (item.identifier === "10003") throw new Error("provider down");
    return { ...item, new_sales: [], used_sales: [], fetched_at: new Date().toISOString(), new_error: null, used_error: null };
  });
  assert.equal(maximum, 4);
  assert.equal(results.length, 20);
  assert.equal(results[3].new_error, "upstream_unavailable");
  assert.equal(results[19].new_error, null);
});
