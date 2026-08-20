# Decision: Bulk Evaluation And Automatic Best Match

## Status

Accepted for the accuracy iteration on 2026-08-20.

## Context

Dense photos currently lose figures in two places: local region proposals can miss small figures, and low-confidence provider responses were sent to a candidate-review UI instead of producing a usable bulk result. The supplied 24-figure test photo produced only nine returned results in the app, so visual inspection alone is not enough to locate the loss.

## Decision

Normal bulk results will always use the highest-scoring priced candidate returned for each physical region, regardless of the provider's `matched` or `review` status. Candidate review is removed from the normal bulk path. A region with no priced candidate remains unresolved and is available through the optional missed-figure recovery flow.

The native pipeline chooses the maximum candidate score itself, rather than assuming the backend response is ordered. Stable region IDs keep duplicate physical figures separate.

Bulk accuracy work uses a private, manifest-driven evaluation loop:

1. Label every visible figure box and figure count in private dense-photo fixtures. Add exact identifiers for a representative subset, including all figures in the primary 24-figure fixture.
2. Run the same detector and per-region recognition path used by the app, then write only normalized boxes, identifiers, candidate IDs, pricing flags, and timings to an evaluation manifest. Photos and crops stay outside git and reports.
3. Score one-to-one box matches at IoU 0.50. Report detection recall/precision, candidate coverage, priced coverage, top-1/top-3 exact ID accuracy, and p50/p95 latency.
4. Tune detector thresholds, tile/merge settings, crop context, and concurrency on development fixtures. Confirm the result on holdout fixtures before changing production defaults.

Run the scorer with:

```bash
npm run test:bulk-eval
BULK_EVAL_MANIFEST=/private/path/report.json npm run eval:bulk -- --enforce
```

## Acceptance Gates

- Primary 24-figure photo: at least 23 detected, every detected region has a candidate, and at least 21 exact priced IDs.
- Holdout set: at least 95% detection recall, 90% detection precision, 90% top-1 exact ID accuracy, 97% top-3 candidate accuracy, and 90% priced coverage.
- A 30-figure case detects at least 29 and automatically identifies at least 27 correctly.
- Complete-scan p50 is below 15 seconds and p95 below 25 seconds.
- No more than a two percentage-point regression on the existing small-scene benchmark.

The gates are release criteria, not claims about the current model. Cloud proposals remain disabled until a private benchmark shows at least a three-point recall gain while precision stays at or above 90%.

## Consequences

Users get a complete bulk result list without being interrupted by uncertain candidate cards. Some low-confidence results may be wrong, so the final summary continues to disclose unresolved regions and the optional recovery action remains available. The evaluator makes this tradeoff measurable and prevents tuning for count alone.

The evaluator stores no photos, crops, authentication tokens, collection data, or provider payloads in reports or telemetry.
