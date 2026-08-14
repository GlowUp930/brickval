# P0 Product Feedback Loop

Date: 2026-08-14

## Decision

Collect only three high-signal feedback types:

- Post-purchase: once after a new annual trial or monthly purchase, asking what converted the user and where they found BrickValue.
- Engaged-user PMF: after at least seven days and five successful scans, at most once every 90 days, asking dependency, primary benefit, and the biggest improvement opportunity.
- Cancellation: once per RevenueCat cancellation event while Pro remains active, asking why the user chose not to renew.

All surveys are optional and dismissible. The priority is cancellation, then post-purchase, then PMF. Aside from the immediate post-purchase exception, no survey is shown within 30 days of another survey. Restore purchases and renewals do not trigger the post-purchase survey.

## Implementation

`ProductFeedbackStore` persists installation identity, cooldowns, handled purchase contexts, and cancellation events in `UserDefaults`. It receives successful scan history from `MonetizationStore` and subscription state from RevenueCat. Submissions use `/api/mobile/feedback/surveys`, are validated server-side, and are stored in the private Supabase `product_feedback` table with a unique dedupe key.

Only product-interaction answers and coarse context are stored: survey type, selected answers, optional free text, cohort, plan/trial state, app build, usage count, and anonymous or signed-in identifier. Scan images, collection data, and contact details are excluded. Submission failures never block access or Pro entitlement.

## Review guardrails

Review responses weekly, but make product decisions from repeated themes, usage evidence, and at least 30 responses for meaningful cohort comparisons. Do not add a public feature board, generic feedback hub, NPS prompt, or scan interruption without a new product decision.
