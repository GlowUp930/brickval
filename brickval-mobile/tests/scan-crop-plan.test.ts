import assert from "node:assert/strict";
import test from "node:test";

import { planMinifigureCrop } from "../lib/scan-crop-plan";

test("single capture pads the detected region and limits its long edge to 1024px", () => {
  const plan = planMinifigureCrop(
    { x: 0.25, y: 0.2, width: 0.3, height: 0.5 },
    { width: 3000, height: 4000 }
  );

  assert.deepEqual(plan.crop, { originX: 570, originY: 560, width: 1260, height: 2480 });
  assert.deepEqual(plan.resize, { width: 520, height: 1024 });
});
