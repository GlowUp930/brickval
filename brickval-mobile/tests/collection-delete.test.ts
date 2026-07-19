import assert from "node:assert/strict";
import { removeCollectionItem, type CollectionItem } from "../lib/collection-core";

const items: CollectionItem[] = [
  {
    set_number: "75192",
    item_type: "set",
    name: "Millennium Falcon",
    theme: "Star Wars",
    pieces: 7541,
    image_url: null,
    market_value_usd: 800,
    rrp_usd: 850,
    gain_pct: -6,
    data_source: "sold",
    quantity: 1,
    condition: "new_sealed",
    market_history: [],
    added_at: "2026-04-20T00:00:00.000Z",
  },
  {
    set_number: "sw0001",
    item_type: "minifig",
    name: "Battle Droid",
    theme: "Star Wars",
    pieces: null,
    image_url: null,
    market_value_usd: 5,
    rrp_usd: null,
    gain_pct: null,
    data_source: "sold",
    quantity: 2,
    condition: "used",
    market_history: [],
    added_at: "2026-04-20T00:00:00.000Z",
  },
];

const next = removeCollectionItem(items, {
  set_number: "75192",
  item_type: "set",
  condition: "new_sealed",
});

assert.equal(next.length, 1);
assert.equal(next[0].set_number, "sw0001");
