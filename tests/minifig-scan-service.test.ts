import assert from "node:assert/strict";
import test from "node:test";

import { runMinifigScan } from "../src/lib/minifig-scan-service";

test("a confident Brickognize identity returns its market snapshot in one scan result", async () => {
  const result = await runMinifigScan(new Blob(["image"], { type: "image/jpeg" }), {
    identify: async () => ({
      detections: [{
        id: "sw0001",
        item_type: "minifig",
        score: 0.92,
        alternatives: [
          { id: "sw0001", score: 0.92 },
          { id: "sw0002", score: 0.72 },
        ],
      }],
    }),
    price: async (itemId) => ({
      payload: { figInfo: { fig_number: itemId, name: "Battle Droid" }, pricing: {} },
      pricingStatus: "fresh",
      pricingUpdatedAt: "2026-07-14T06:00:00.000Z",
    }),
    now: (() => {
      const values = [0, 120, 120, 145, 145];
      return () => values.shift() ?? 145;
    })(),
  });

  assert.equal(result.status, "matched");
  assert.equal(result.identification.id, "sw0001");
  assert.equal(result.result.figInfo.name, "Battle Droid");
  assert.equal(result.pricingStatus, "fresh");
  assert.equal(result.identifyMs, 120);
  assert.equal(result.pricingMs, 25);
  assert.equal(result.totalMs, 145);
});

test("similar Brickognize candidates require review instead of claiming a match", async () => {
  let pricingRequested = false;
  const result = await runMinifigScan(new Blob(["image"], { type: "image/jpeg" }), {
    identify: async () => ({
      detections: [{
        id: "sw0001",
        item_type: "minifig",
        score: 0.91,
        alternatives: [
          { id: "sw0001", score: 0.91 },
          { id: "sw0002", score: 0.86 },
        ],
      }],
    }),
    price: async () => {
      pricingRequested = true;
      throw new Error("must not price an ambiguous identity");
    },
    now: () => 100,
  });

  assert.equal(result.status, "review");
  assert.equal(result.detections.length, 1);
  assert.equal(pricingRequested, false);
});

test("an empty Brickognize response remains not found and never becomes match found", async () => {
  const result = await runMinifigScan(new Blob(["image"], { type: "image/jpeg" }), {
    identify: async () => ({ detections: [] }),
    price: async () => {
      assert.fail("missing identities must not be priced");
    },
    now: () => 100,
  });

  assert.equal(result.status, "not-found");
  assert.equal(result.pricingMs, 0);
});
