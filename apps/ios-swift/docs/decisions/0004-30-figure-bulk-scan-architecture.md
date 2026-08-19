# Decision: One-Region Bulk Recognition

## Status

Accepted for the dense bulk-scan rollout on 2026-08-19.

## Context

Brickognize is a one-item image recognizer. The previous bulk service sent crops containing several figures, then tried to assign one provider response back to multiple physical regions. Dense photos consequently produced a small number of accepted matches even when the figures were visible.

The target is reliable recognition of dense lots at low operating cost. Camera scans must remain responsive, while photo-library scans can spend more local compute on small figures.

## Decision

Use a session-based, one-region recognition pipeline:

1. Core ML proposes regions locally. Photo-library imports use a full-image pass and overlapping 3x3, 4x4, and 5x5 tiled passes. Overlapping proposals are merged while spatially separate duplicates remain separate.
2. The native client sends a source-aware manifest to `/api/minifig/bulk-scan/start`. Camera manifests are capped at 10 regions; photo-library manifests are capped at 40.
3. The server issues a signed ten-minute session. The native client crops each region with 25% context, upscales within the image processor, and sends one crop at a time to `/api/minifig/bulk-scan/identify-region`.
4. Four recognition requests may run concurrently. A weak result may receive one 40%-context retry. Results are associated with stable region IDs and remain ordered spatially, even when requests finish out of order.
5. Each region returns up to three priced candidates. High-confidence matches are accepted; ambiguous matches enter the existing review UI; unresolved regions are disclosed but excluded from totals.

Google Vision object localization is an optional proposal source, disabled by default. It can be enabled server-side only after a benchmark demonstrates a meaningful recall gain without unacceptable precision loss. The native detector remains the default source of truth.

## Cost And Privacy

- Recognition continues to use the existing Brickognize integration; no new paid recognition provider is added.
- One imported bulk operation consumes one existing bulk allowance, not one allowance per region.
- The signed session is rate-limited to 80 region calls per ten minutes, covering 40 figures and one retry each. Manual recovery retains its separate 20-call budget.
- Photos, crops, provider payloads, authentication tokens, and collection contents are never logged or sent to Sentry.
- Provider credentials and the optional Google Vision key remain server-only.

## Rollout Gates

- Keep the compatibility endpoint for older native builds.
- Benchmark the supplied dense photos and a held-out scene set before enabling any cloud proposal source.
- Measure region recall, auto-accept precision, candidate availability, latency, provider errors, and cloud spend.
- Do not claim reliable 30-figure scanning until the benchmark acceptance thresholds pass.

## Consequences

This increases request count for dense photos, but it fixes the core one-provider-image mismatch and keeps cost bounded by the 40-region cap plus one retry. The initial native implementation presents the completed region results through the existing rapid reveal/review screen; request-level responses are collected before that presentation so the current collection, recovery, pagination, and atomic-save behavior remain intact.
