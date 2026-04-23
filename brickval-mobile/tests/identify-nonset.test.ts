import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBrickognizeRecoveryCrops,
  normalizeBrickognizeDetections,
  normalizeBrickognizeSearchResponse,
} from "../../src/lib/identify-nonset";

test("normalizeBrickognizeDetections keeps only part and minifig results, dedupes by type/id, sorts by score, and caps each section", () => {
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
    { id: "75192", type: "set", score: 0.99 },
    { id: "", type: "part", score: 0.9 },
  ]);

  assert.deepEqual(detections.minifigs, [
    { id: "sw0001", item_type: "minifig", score: 0.94 },
    { id: "sw0002", item_type: "minifig", score: 0.82 },
    { id: "sw0003", item_type: "minifig", score: 0.8 },
    { id: "sw0004", item_type: "minifig", score: 0.78 },
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

test("buildBrickognizeRecoveryCrops returns a 4-crop grid for a weak crowded single detection", () => {
  const crops = buildBrickognizeRecoveryCrops(
    {
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
              score: 0.62,
            },
          ],
          candidate_items: [
            {
              id: "fig-spidey",
              type: "fig",
              score: 0.91,
              external_items: [{ external_id: "sh0115" }],
            },
          ],
        },
      ],
    },
    1000,
    600
  );

  assert.deepEqual(crops, [
    { left: 0, top: 0, width: 580, height: 348 },
    { left: 420, top: 0, width: 580, height: 348 },
    { left: 0, top: 252, width: 580, height: 348 },
    { left: 420, top: 252, width: 580, height: 348 },
  ]);
});

test("buildBrickognizeRecoveryCrops skips retries when two usable detections already exist", () => {
  const crops = buildBrickognizeRecoveryCrops(
    {
      detected_items: [
        {
          candidate_items: [
            {
              id: "fig-a",
              type: "fig",
              score: 0.95,
              external_items: [{ external_id: "fig-a" }],
            },
            {
              id: "fig-b",
              type: "fig",
              score: 0.82,
              external_items: [{ external_id: "fig-b" }],
            },
          ],
        },
      ],
    },
    1000,
    600
  );

  assert.deepEqual(crops, []);
});
