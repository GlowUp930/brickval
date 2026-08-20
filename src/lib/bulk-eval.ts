import type { NormalizedRegionBox } from "./bulk-identify";

export type BulkEvalRegion = {
  regionId: string;
  boundingBox: NormalizedRegionBox;
  identifier?: string;
};

export type BulkEvalPrediction = {
  regionId: string;
  boundingBox: NormalizedRegionBox;
  identifier?: string;
  candidateIdentifiers?: string[];
  priced?: boolean;
};

export type BulkEvalCase = {
  id: string;
  groundTruth: BulkEvalRegion[];
  predictions: BulkEvalPrediction[];
  totalMilliseconds?: number;
};

export type BulkEvalRun = {
  schemaVersion: 1;
  dataset: string;
  split: "development" | "holdout" | "stress";
  cases: BulkEvalCase[];
};

export type BulkEvalCaseMetrics = {
  id: string;
  expected: number;
  predicted: number;
  matched: number;
  detectionPrecision: number;
  detectionRecall: number;
  candidateCoverage: number;
  pricedCoverage: number;
  exactIdEligible: number;
  top1Correct: number;
  top3Correct: number;
  totalMilliseconds: number | null;
};

export type BulkEvalMetrics = {
  cases: BulkEvalCaseMetrics[];
  expected: number;
  predicted: number;
  matched: number;
  detectionPrecision: number;
  detectionRecall: number;
  candidateCoverage: number;
  pricedCoverage: number;
  exactIdEligible: number;
  top1Correct: number;
  top3Correct: number;
  latencyP50Milliseconds: number | null;
  latencyP95Milliseconds: number | null;
  thirtyFigureCase: {
    id: string;
    expected: number;
    matched: number;
    top1Correct: number;
    detectionTargetMet: boolean;
    exactIdTargetMet: boolean;
  } | null;
  gates: {
    detectionRecall: boolean;
    detectionPrecision: boolean;
    top1Accuracy: boolean;
    top3Accuracy: boolean;
    pricedCoverage: boolean;
    thirtyFigureCase: boolean;
    allPassed: boolean;
  };
};

type Match = { truthIndex: number; predictionIndex: number; iou: number };

export function intersectionOverUnion(
  left: NormalizedRegionBox,
  right: NormalizedRegionBox,
): number {
  const leftRight = Math.min(left.x + left.width, right.x + right.width);
  const rightLeft = Math.max(left.x, right.x);
  const bottom = Math.min(left.y + left.height, right.y + right.height);
  const top = Math.max(left.y, right.y);
  const intersectionWidth = Math.max(0, leftRight - rightLeft);
  const intersectionHeight = Math.max(0, bottom - top);
  const intersection = intersectionWidth * intersectionHeight;
  const union = left.width * left.height + right.width * right.height - intersection;
  return union > 0 ? intersection / union : 0;
}

export function matchBulkEvalRegions(
  groundTruth: BulkEvalRegion[],
  predictions: BulkEvalPrediction[],
  threshold = 0.5,
): Match[] {
  const pairs: Match[] = [];
  for (let truthIndex = 0; truthIndex < groundTruth.length; truthIndex += 1) {
    for (let predictionIndex = 0; predictionIndex < predictions.length; predictionIndex += 1) {
      const iou = intersectionOverUnion(
        groundTruth[truthIndex].boundingBox,
        predictions[predictionIndex].boundingBox,
      );
      if (iou >= threshold) pairs.push({ truthIndex, predictionIndex, iou });
    }
  }
  pairs.sort((left, right) => right.iou - left.iou);
  const usedTruth = new Set<number>();
  const usedPredictions = new Set<number>();
  return pairs.filter((pair) => {
    if (usedTruth.has(pair.truthIndex) || usedPredictions.has(pair.predictionIndex)) return false;
    usedTruth.add(pair.truthIndex);
    usedPredictions.add(pair.predictionIndex);
    return true;
  });
}

export function evaluateBulkCase(
  input: BulkEvalCase,
  iouThreshold = 0.5,
): BulkEvalCaseMetrics {
  const matches = matchBulkEvalRegions(input.groundTruth, input.predictions, iouThreshold);
  let candidateCoverage = 0;
  let pricedCoverage = 0;
  let exactIdEligible = 0;
  let top1Correct = 0;
  let top3Correct = 0;

  for (const match of matches) {
    const truth = input.groundTruth[match.truthIndex];
    const prediction = input.predictions[match.predictionIndex];
    const candidates = prediction.candidateIdentifiers ?? (prediction.identifier ? [prediction.identifier] : []);
    if (candidates.length > 0) candidateCoverage += 1;
    if (prediction.priced === true) pricedCoverage += 1;
    if (!truth.identifier) continue;
    exactIdEligible += 1;
    if (prediction.identifier === truth.identifier) top1Correct += 1;
    if (candidates.slice(0, 3).includes(truth.identifier)) top3Correct += 1;
  }

  return {
    id: input.id,
    expected: input.groundTruth.length,
    predicted: input.predictions.length,
    matched: matches.length,
    detectionPrecision: ratio(matches.length, input.predictions.length),
    detectionRecall: ratio(matches.length, input.groundTruth.length),
    candidateCoverage: ratio(candidateCoverage, matches.length),
    pricedCoverage: ratio(pricedCoverage, matches.length),
    exactIdEligible,
    top1Correct,
    top3Correct,
    totalMilliseconds: input.totalMilliseconds ?? null,
  };
}

export function evaluateBulkRun(input: BulkEvalRun, iouThreshold = 0.5): BulkEvalMetrics {
  const cases = input.cases.map((item) => evaluateBulkCase(item, iouThreshold));
  const expected = sum(cases.map((item) => item.expected));
  const predicted = sum(cases.map((item) => item.predicted));
  const matched = sum(cases.map((item) => item.matched));
  const exactIdEligible = sum(cases.map((item) => item.exactIdEligible));
  const top1Correct = sum(cases.map((item) => item.top1Correct));
  const top3Correct = sum(cases.map((item) => item.top3Correct));
  const candidateMatches = cases.reduce((total, item) => total + item.candidateCoverage * item.matched, 0);
  const pricedMatches = cases.reduce((total, item) => total + item.pricedCoverage * item.matched, 0);
  const latencies = cases
    .map((item) => item.totalMilliseconds)
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);
  const thirtyFigureCase = cases
    .filter((item) => item.expected >= 30)
    .sort((left, right) => right.expected - left.expected)[0];
  const thirtyFigureSummary = thirtyFigureCase
    ? {
        id: thirtyFigureCase.id,
        expected: thirtyFigureCase.expected,
        matched: thirtyFigureCase.matched,
        top1Correct: thirtyFigureCase.top1Correct,
        detectionTargetMet: thirtyFigureCase.matched >= thirtyFigureCase.expected - 1,
        exactIdTargetMet: thirtyFigureCase.exactIdEligible > 0 && thirtyFigureCase.top1Correct >= 27,
      }
    : null;
  const gates = {
    detectionRecall: ratio(matched, expected) >= 0.95,
    detectionPrecision: ratio(matched, predicted) >= 0.90,
    top1Accuracy: ratio(top1Correct, exactIdEligible) >= 0.90,
    top3Accuracy: ratio(top3Correct, exactIdEligible) >= 0.97,
    pricedCoverage: ratio(pricedMatches, matched) >= 0.90,
    thirtyFigureCase: thirtyFigureSummary?.detectionTargetMet === true && thirtyFigureSummary.exactIdTargetMet,
    allPassed: false,
  };
  gates.allPassed = Object.entries(gates)
    .filter(([key]) => key !== "allPassed")
    .every(([, passed]) => passed);

  return {
    cases,
    expected,
    predicted,
    matched,
    detectionPrecision: ratio(matched, predicted),
    detectionRecall: ratio(matched, expected),
    candidateCoverage: ratio(candidateMatches, matched),
    pricedCoverage: ratio(pricedMatches, matched),
    exactIdEligible,
    top1Correct,
    top3Correct,
    latencyP50Milliseconds: percentile(latencies, 0.5),
    latencyP95Milliseconds: percentile(latencies, 0.95),
    thirtyFigureCase: thirtyFigureSummary,
    gates,
  };
}

export function formatBulkEvalMarkdown(input: BulkEvalRun, metrics: BulkEvalMetrics): string {
  const percentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const lines = [
    `# Bulk scan evaluation: ${input.dataset}`,
    `Split: ${input.split} | IoU threshold: 0.50`,
    "",
    "| Metric | Result | Gate |",
    "| --- | ---: | --- |",
    `| Detection recall | ${percentage(metrics.detectionRecall)} | ${metrics.gates.detectionRecall ? "PASS" : "FAIL"} (>=95%) |`,
    `| Detection precision | ${percentage(metrics.detectionPrecision)} | ${metrics.gates.detectionPrecision ? "PASS" : "FAIL"} (>=90%) |`,
    `| Candidate coverage | ${percentage(metrics.candidateCoverage)} | informational |`,
    `| Priced coverage | ${percentage(metrics.pricedCoverage)} | ${metrics.gates.pricedCoverage ? "PASS" : "FAIL"} (>=90%) |`,
    `| Top-1 exact ID | ${metrics.top1Correct}/${metrics.exactIdEligible} (${percentage(ratio(metrics.top1Correct, metrics.exactIdEligible))}) | ${metrics.gates.top1Accuracy ? "PASS" : "FAIL"} (>=90%) |`,
    `| Top-3 exact ID | ${metrics.top3Correct}/${metrics.exactIdEligible} (${percentage(ratio(metrics.top3Correct, metrics.exactIdEligible))}) | ${metrics.gates.top3Accuracy ? "PASS" : "FAIL"} (>=97%) |`,
    `| Latency p50 | ${formatMilliseconds(metrics.latencyP50Milliseconds)} | informational |`,
    `| Latency p95 | ${formatMilliseconds(metrics.latencyP95Milliseconds)} | informational |`,
  ];
  if (metrics.thirtyFigureCase) {
    lines.push(
      "",
      `30+ figure case: ${metrics.thirtyFigureCase.id} detected ${metrics.thirtyFigureCase.matched}/${metrics.thirtyFigureCase.expected}; top-1 exact ${metrics.thirtyFigureCase.top1Correct}.`,
      `Overall gates: ${metrics.gates.allPassed ? "PASS" : "FAIL"}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function percentile(values: number[], rank: number): number | null {
  if (values.length === 0) return null;
  const index = Math.min(values.length - 1, Math.ceil(values.length * rank) - 1);
  return values[index];
}

function formatMilliseconds(value: number | null): string {
  return value === null ? "n/a" : `${value} ms`;
}
