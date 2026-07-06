import assert from "node:assert/strict";
import test from "node:test";

import { MINIFIG_BATCH_LIMIT, sanitizeBulkMinifigNumbers } from "../lib/minifig-lookup";

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
    "sw0011",
    "sw0012",
    "sw0013",
    "sw0014",
    "sw0015",
    "sw0016",
    "sw0017",
    "sw0018",
    "sw0019",
    "sw0020",
    "sw0021",
  ]);

  assert.equal(ids.length, MINIFIG_BATCH_LIMIT);
  assert.deepEqual(ids.slice(0, 3), ["sh0329", "figsh0115", "coltlbm16"]);
  assert.equal(ids.includes("sw0018"), false);
});
