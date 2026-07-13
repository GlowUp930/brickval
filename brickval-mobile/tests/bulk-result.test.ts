import assert from "node:assert/strict";
import test from "node:test";

import { getPhysicalMinifigQuantities } from "../lib/bulk-result";

test("bulk results count identical figures by physical region", () => {
  const quantities = getPhysicalMinifigQuantities([
    { id: "sw0001", item_type: "minifig", score: 0.95, regionId: "region-1" },
    { id: "sw0001", item_type: "minifig", score: 0.93, regionId: "region-2" },
    { id: "sh0115", item_type: "minifig", score: 0.91, regionId: "region-3" },
  ]);

  assert.deepEqual(quantities, { sw0001: 2, sh0115: 1 });
});
