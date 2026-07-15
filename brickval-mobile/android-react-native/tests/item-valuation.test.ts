import assert from "node:assert/strict";
import test from "node:test";
import { buildValuationChart } from "../lib/item-valuation";

test("buildValuationChart produces one shared market model for saved and live details", () => {
  const model = buildValuationChart(
    [
      { date: "2026-01-01", price_usd: 5, source: "bricklink" },
      { date: "2026-02-01", price_usd: 7, source: "bricklink" },
    ],
    300,
    220,
    194,
    2
  );

  assert.equal(model.low, 10);
  assert.equal(model.high, 14);
  assert.equal(model.change, 4);
  assert.equal(model.points[1].x, 300);
  assert.match(model.linePath, /^M /);
  assert.match(model.areaPath, / Z$/);
});
