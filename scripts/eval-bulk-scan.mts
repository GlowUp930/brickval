import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  evaluateBulkRun,
  formatBulkEvalMarkdown,
  type BulkEvalRun,
} from "../src/lib/bulk-eval";

const manifestPath = process.argv[2] ?? process.env.BULK_EVAL_MANIFEST;
if (!manifestPath) {
  throw new Error("Pass a private evaluation JSON path or set BULK_EVAL_MANIFEST.");
}

const input = JSON.parse(await readFile(resolve(manifestPath), "utf8")) as BulkEvalRun;
validateRun(input);
const metrics = evaluateBulkRun(input);
const report = formatBulkEvalMarkdown(input, metrics);
const outputPath = process.env.BULK_EVAL_REPORT;

if (outputPath) await writeFile(resolve(outputPath), report, "utf8");
process.stdout.write(report);
if (process.argv.includes("--enforce") && !metrics.gates.allPassed) process.exitCode = 1;

function validateRun(value: BulkEvalRun): void {
  if (value.schemaVersion !== 1) throw new Error("Unsupported bulk evaluation schema version.");
  if (!value.dataset.trim() || !value.cases.length) throw new Error("Evaluation dataset must contain at least one case.");
  for (const item of value.cases) {
    if (!item.id.trim() || !Array.isArray(item.groundTruth) || !Array.isArray(item.predictions)) {
      throw new Error(`Invalid evaluation case: ${item.id}`);
    }
  }
}
