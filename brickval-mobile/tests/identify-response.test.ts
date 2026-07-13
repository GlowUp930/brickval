import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeBrickognizeDetections,
  normalizeBrickognizeSearchResponse,
  normalizeIdentificationDetections,
} from "../lib/identify-response";

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

test("normalizeBrickognizeDetections keeps LEGO minifig and part matches, dedupes by type/id, and sorts by score", () => {
  const detections = normalizeBrickognizeDetections([
    { id: "sw0001", type: "MINIFIG", score: 0.94 },
    { id: "3001", type: "part", score: 0.91 },
    { id: "sw0001", type: "fig", score: 0.9 },
    { id: "3023", type: "part", score: 0.89 },
    { id: "3039", type: "part", score: 0.88 },
    { id: "3068b", type: "part", score: 0.87 },
    { id: "3626pb1234", type: "part", score: 0.86 },
    { id: "sw0002", type: "minifig", score: 0.82 },
    { id: "sw0003", type: "minifig", score: 0.8 },
    { id: "sw0004", type: "minifig", score: 0.78 },
    { id: "sw0005", type: "minifig", score: 0.76 },
    { id: "sw0006", type: "minifig", score: 0.74 },
    { id: "sw0007", type: "minifig", score: 0.72 },
    { id: "sw0008", type: "minifig", score: 0.7 },
    { id: "sw0009", type: "minifig", score: 0.68 },
    { id: "sw0010", type: "minifig", score: 0.66 },
    { id: "sw0011", type: "minifig", score: 0.64 },
    { id: "sw0012", type: "minifig", score: 0.62 },
    { id: "sw0013", type: "minifig", score: 0.6 },
    { id: "sw0014", type: "minifig", score: 0.58 },
    { id: "sw0015", type: "minifig", score: 0.56 },
    { id: "sw0016", type: "minifig", score: 0.54 },
    { id: "sw0017", type: "minifig", score: 0.52 },
    { id: "sw0018", type: "minifig", score: 0.5 },
    { id: "sw0019", type: "minifig", score: 0.48 },
    { id: "sw0020", type: "minifig", score: 0.46 },
    { id: "sw0021", type: "minifig", score: 0.44 },
    { id: "75192", type: "set", score: 0.99 },
    { id: "", type: "part", score: 0.9 },
  ]);

  assert.equal(detections.minifigs.length, 21);
  assert.deepEqual(detections.minifigs.slice(0, 2), [
    { id: "sw0001", item_type: "minifig", score: 0.94 },
    { id: "sw0002", item_type: "minifig", score: 0.82 },
  ]);
  assert.deepEqual(detections.parts, [
    { id: "3001", item_type: "part", score: 0.91 },
    { id: "3023", item_type: "part", score: 0.89 },
    { id: "3039", item_type: "part", score: 0.88 },
    { id: "3068b", item_type: "part", score: 0.87 },
  ]);
});

test("normalizeBrickognizeSearchResponse flattens multiple detected items into multiple usable matches", () => {
  const detections = normalizeBrickognizeSearchResponse({
    detected_items: [
      {
        candidate_items: [
          {
            id: "fig-ncklc007",
            type: "fig",
            score: 0.94,
            external_items: [{ external_id: "ncklc007" }],
          },
          {
            id: "fig-ncklc010",
            type: "fig",
            score: 0.52,
            external_items: [{ external_id: "ncklc010" }],
          },
        ],
      },
      {
        candidate_items: [
          {
            id: "fig-cas095",
            type: "fig",
            score: 0.86,
            external_items: [{ external_id: "cas095" }],
          },
        ],
      },
    ],
  });

  assert.deepEqual(detections.minifigs, [
    { id: "ncklc007", item_type: "minifig", score: 0.94 },
    { id: "cas095", item_type: "minifig", score: 0.86 },
    { id: "ncklc010", item_type: "minifig", score: 0.52 },
  ]);
});

test("normalizeIdentificationDetections chooses one best match per detected item for bulk scan UX", () => {
  const detections = normalizeIdentificationDetections("minifig", {
    set_number: null,
    detected_items: [
      {
        bounding_boxes: [
          {
            left: 100,
            upper: 150,
            right: 260,
            lower: 390,
            image_width: 1000,
            image_height: 600,
          },
        ],
        candidate_items: [
          { id: "fig-sh0115", type: "fig", score: 0.94, external_items: [{ external_id: "sh0115" }] },
          { id: "fig-sh0114", type: "fig", score: 0.51, external_items: [{ external_id: "sh0114" }] },
        ],
      },
      {
        candidate_items: [
          { id: "fig-sh0329", type: "fig", score: 0.88, external_items: [{ external_id: "sh0329" }] },
        ],
      },
    ],
  });

  assert.deepEqual(detections, [
    {
      id: "sh0115",
      item_type: "minifig",
      score: 0.94,
      bounding_box: {
        left: 100,
        top: 150,
        right: 260,
        bottom: 390,
        imageWidth: 1000,
        imageHeight: 600,
      },
    },
    { id: "sh0329", item_type: "minifig", score: 0.88 },
  ]);
});
