---
name: stripe-wire
description: Wire up the BrickVal Stripe paywall — enable the scan-gate, Clerk→Supabase user sync, and Stripe webhook events. Run when ready to activate Phase 2 monetisation.
---

You are implementing the BrickVal paywall. The scan-gate is currently stubbed (returns allowed: true for everyone). Your job is to wire it up properly. Follow these steps in order and confirm with the user after each one before proceeding.

## Context
- Free limit: 5 scans per user
- Paid plan: $12.99 AUD/month (BrickVal Pro)
- Supabase table: `users` (id=Clerk userId, scans_used int, is_pro bool, hit_paywall_at timestamp)
- Supabase RPC: `increment_scan(p_user_id text, p_free_limit int)` — already deployed, handles atomicity
- Stripe events to handle: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

## Step 1 — Enable scan-gate
Replace the stub in `src/lib/scan-gate.ts` with a real call to `supabase.rpc('increment_scan', { p_user_id: userId, p_free_limit: 5 })`. Map the returned jsonb to the `ScanGateResult` type. Upsert the user row if it doesn't exist yet (on first scan).

## Step 2 — Stripe webhook
In `src/app/api/webhook/route.ts`, ensure all three subscription lifecycle events update `is_pro` in the `users` table:
- `customer.subscription.updated` → set is_pro based on subscription status ('active' or 'trialing' = true, else false)
- `customer.subscription.deleted` → set is_pro = false
- `invoice.payment_failed` → set is_pro = false

Always verify the Stripe signature with `stripe.webhooks.constructEvent()` before processing.

## Step 3 — Paywall UI
If the `/api/lookup` route returns `{ error: 'paywall' }`, redirect the user to `/upgrade`. Confirm the upgrade page links correctly to the Stripe checkout Server Action in `src/app/upgrade/actions.ts`.

## Rules
- Never read-then-write scan counts — always use the RPC
- Never skip Stripe signature verification
- Confirm with the user after each step before starting the next
- After all steps, run the security-reviewer agent to verify the implementation
