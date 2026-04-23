import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCollectionItem, removeCollectionItem, type CollectionItem } from "../lib/collection-core";

test("normalizeCollectionItem preserves explicit part type and color metadata", () => {
  const normalized = normalizeCollectionItem({
    set_number: "3001",
    item_type: "part",
    name: "Brick 2 x 4",
    theme: "Part",
    pieces: null,
    image_url: " https://example.com/3001.png ",
    market_value_usd: 0.24,
    rrp_usd: null,
    gain_pct: null,
    data_source: "sold",
    quantity: 2,
    condition: "used",
    color_id: 5,
    color_name: "Red",
    market_history: [{ date: "2026-04-20T12:00:00.000Z", price_usd: 0.24, source: "bricklink" }],
    added_at: "2026-04-20T00:00:00.000Z",
  } satisfies CollectionItem);

  assert.equal(normalized.item_type, "part");
  assert.equal(normalized.color_id, 5);
  assert.equal(normalized.color_name, "Red");
  assert.equal(normalized.image_url, "https://example.com/3001.png");
  assert.equal(normalized.market_history[0]?.date, "2026-04-20");
});

test("removeCollectionItem only removes the matching part color and condition", () => {
  const items: CollectionItem[] = [
    {
      set_number: "3001",
      item_type: "part",
      name: "Brick 2 x 4",
      theme: "Part",
      pieces: null,
      image_url: null,
      market_value_usd: 0.24,
      rrp_usd: null,
      gain_pct: null,
      data_source: "sold",
      quantity: 3,
      condition: "used",
      color_id: 5,
      color_name: "Red",
      market_history: [],
      added_at: "2026-04-20T00:00:00.000Z",
    },
    {
      set_number: "3001",
      item_type: "part",
      name: "Brick 2 x 4",
      theme: "Part",
      pieces: null,
      image_url: null,
      market_value_usd: 0.19,
      rrp_usd: null,
      gain_pct: null,
      data_source: "sold",
      quantity: 2,
      condition: "used",
      color_id: 1,
      color_name: "White",
      market_history: [],
      added_at: "2026-04-20T00:00:00.000Z",
    },
  ];

  const next = removeCollectionItem(items, {
    set_number: "3001",
    item_type: "part",
    condition: "used",
    color_id: 5,
  });

  assert.equal(next.length, 1);
  assert.equal(next[0].color_id, 1);
});
