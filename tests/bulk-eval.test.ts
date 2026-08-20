import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateBulkCase,
  evaluateBulkRun,
  formatBulkEvalMarkdown,
  type BulkEvalRun,
} from "../src/lib/bulk-eval";

const box = (x: number, y: number, width = 0.1, height = 0.2) => ({ x, y, width, height });

test("bulk eval matches physical regions one-to-one and preserves duplicates", () => {
  const metrics = evaluateBulkCase({
    id: "duplicate-fixtures",
    groundTruth: [
      { regionId: "truth-1", boundingBox: box(0.1, 0.1), identifier: "sh0001" },
      { regionId: "truth-2", boundingBox: box(0.1, 0.1), identifier: "sh0001" },
    ],
    predictions: [
      { regionId: "pred-1", boundingBox: box(0.1, 0.1), identifier: "sh0001", priced: true },
      { regionId: "pred-2", boundingBox: box(0.1, 0.1), identifier: "sh0001", priced: true },
    ],
  });

  assert.equal(metrics.matched, 2);
  assert.equal(metrics.detectionPrecision, 1);
  assert.equal(metrics.detectionRecall, 1);
  assert.equal(metrics.top1Correct, 2);
});

test("bulk eval measures candidate coverage and top-three accuracy separately", () => {
  const metrics = evaluateBulkCase({
    id: "candidate-queue",
    groundTruth: [{ regionId: "truth-1", boundingBox: box(0.1, 0.1), identifier: "sh0003" }],
    predictions: [{
      regionId: "pred-1",
      boundingBox: box(0.1, 0.1),
      identifier: "sh0001",
      candidateIdentifiers: ["sh0001", "sh0002", "sh0003"],
      priced: true,
    }],
  });

  assert.equal(metrics.candidateCoverage, 1);
  assert.equal(metrics.top1Correct, 0);
  assert.equal(metrics.top3Correct, 1);
});

test("bulk eval reports the 30-figure gate without treating a missing exact label as a pass", () => {
  const run: BulkEvalRun = {
    schemaVersion: 1,
    dataset: "private-dense-fixtures",
    split: "holdout",
    cases: [{
      id: "scene-30",
      groundTruth: Array.from({ length: 30 }, (_, index) => ({
        regionId: `truth-${index}`,
        boundingBox: box((index % 10) * 0.09, Math.floor(index / 10) * 0.2),
      })),
      predictions: Array.from({ length: 29 }, (_, index) => ({
        regionId: `pred-${index}`,
        boundingBox: box((index % 10) * 0.09, Math.floor(index / 10) * 0.2),
        priced: true,
      })),
    }],
  };

  const metrics = evaluateBulkRun(run);
  assert.equal(metrics.thirtyFigureCase?.detectionTargetMet, true);
  assert.equal(metrics.thirtyFigureCase?.exactIdTargetMet, false);
  assert.match(formatBulkEvalMarkdown(run, metrics), /30\+ figure case/);
});

test("bulk eval can pass all gates when a labeled 30-figure case meets the targets", () => {
  const regions = Array.from({ length: 30 }, (_, index) => ({
    regionId: `region-${index}`,
    boundingBox: box((index % 10) * 0.09, Math.floor(index / 10) * 0.2),
    identifier: `sh${String(index).padStart(4, "0")}`,
  }));
  const run: BulkEvalRun = {
    schemaVersion: 1,
    dataset: "private-dense-fixtures",
    split: "holdout",
    cases: [{
      id: "scene-30-labeled",
      groundTruth: regions,
      predictions: regions.map((region) => ({
        regionId: region.regionId,
        boundingBox: region.boundingBox,
        identifier: region.identifier,
        candidateIdentifiers: [region.identifier],
        priced: true,
      })),
      totalMilliseconds: 12000,
    }],
  };

  const metrics = evaluateBulkRun(run);
  assert.equal(metrics.gates.allPassed, true);
});
