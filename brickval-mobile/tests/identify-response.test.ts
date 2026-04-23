import assert from "node:assert/strict";
import test from "node:test";

import { normalizeIdentificationDetections } from "../lib/identify-response";

test("normalizeIdentificationDetections turns minifig candidates into detections when the backend omits detections", () => {
  const detections = normalizeIdentificationDetections("minifig", {
    set_number: "ncklc007",
    confidence: 0.82,
    candidates: [
      { id: "ncklc007", score: 0.82 },
      { id: "ncklc010", score: 0.52 },
    ],
  });

  assert.deepEqual(detections, [
    { id: "ncklc007", item_type: "minifig", score: 0.82 },
    { id: "ncklc010", item_type: "minifig", score: 0.52 },
  ]);
});

