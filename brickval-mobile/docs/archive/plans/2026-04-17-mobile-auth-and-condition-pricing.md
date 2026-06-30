# BrickVal Mobile Auth and Condition Pricing Implementation Plan

**Status:** Resolved. Google sign-in is fixed after aligning Clerk with the correct Google Cloud web client and Android keystore fingerprints. Condition-aware collection pricing was also completed.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two real mobile app bugs called out in `brickval-mobile/AGENTS.md`: Google sign-in not completing on Android, and collection pricing ignoring selected condition.

**Architecture:** Treat these as two separate fixes. First isolate the Google sign-in failure with evidence from the native app, Clerk state, and build configuration before changing the auth flow. Then fix the collection bug by making saved price and saved history condition-aware from the moment the user taps "Save to collection", so Home and detail screens read correct stored values without extra runtime branching.

**Tech Stack:** Expo 55, Expo Router, React Native, `@clerk/expo`, Expo WebBrowser/AuthSession plumbing, Expo Secure Store, TypeScript.

---

## Scope notes

- The bugs that belong in this plan are:
  - Native Google sign-in stuck on "Checking session..." / sign-in never completes.
  - Collection pricing stores the same value for `"new_sealed"` and `"used"`.
- The following are **not** part of this debugging plan:
  - Superwall dashboard campaign sync: dashboard/config work, not app debugging.
  - eBay Marketplace Insights approval: external approval dependency.
  - General test framework setup: out of scope unless a tiny focused test is needed for a new pure function.
- Per `brickval-mobile/AGENTS.md`, stop after each bugfix and get confirmation before moving to the next one.

### File map

- Modify: `brickval-mobile/app/account.tsx`
- Modify: `brickval-mobile/app/_layout.tsx`
- Modify: `brickval-mobile/app.json` only if the verified root cause is callback/deep-link configuration
- Modify: `brickval-mobile/eas.json` only if the verified root cause is missing build-time auth env
- Modify: `brickval-mobile/lib/clerk.ts`
- Modify: `brickval-mobile/lib/collection.ts`
- Modify: `brickval-mobile/components/ResultCard.tsx`
- Modify: `brickval-mobile/lib/api.ts`
- Modify: `brickval-mobile/app/(tabs)/index.tsx`
- Modify: `brickval-mobile/app/detail/[itemType]/[setNumber].tsx`

---

### Task 1: Reproduce and isolate the Google sign-in failure

**Files:**
- Modify: `brickval-mobile/app/account.tsx`
- Modify: `brickval-mobile/lib/clerk.ts`
- Modify: `brickval-mobile/app/_layout.tsx`

- [ ] **Step 1: Add temporary auth-state instrumentation**

Add short-lived logs around Clerk bootstrap and Google sign-in so one APK run tells us where the flow dies:

```ts
// app/account.tsx
useEffect(() => {
  console.log("[account] auth state", {
    isLoaded,
    isSignedIn,
    hasUser: Boolean(user),
    userId: user?.id ?? null,
  });
}, [isLoaded, isSignedIn, user]);

const handleGoogleSignIn = async () => {
  setAuthBusy(true);
  setErrorMessage(null);
  console.log("[account] starting google sign-in", { isLoaded, isSignedIn });

  try {
    const result = await startSSOFlow({ strategy: "oauth_google" });
    console.log("[account] google result", {
      createdSessionId: result.createdSessionId ?? null,
      hasSetActive: Boolean(result.setActive),
      signInStatus: (result as any).signIn?.status ?? null,
      signUpStatus: (result as any).signUp?.status ?? null,
    });
```

- [ ] **Step 2: Run the app in the same environment as the failing APK**

Run one of these, depending on what the founder is actually testing:

```bash
cd /Users/holamchan/brickval/brickval-mobile
npm run android
```

or

```bash
cd /Users/holamchan/brickval/brickval-mobile
npm run build:preview
```

Expected evidence to capture:
- Whether `isLoaded` ever flips from `false` to `true`
- Whether `startSSOFlow()` resolves, rejects, or never opens browser/native UI
- Whether a session id is returned but `setActive()` fails

- [ ] **Step 3: Check build and config prerequisites before code changes**

Verify these facts, because any one of them can make the current code look broken:

```bash
cd /Users/holamchan/brickval/brickval-mobile
cut -d= -f1 .env.local | rg '^EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY$'
sed -n '1,120p' app.json
sed -n '1,120p' eas.json
```

Manual dashboard checks:
- Clerk Google social connection is enabled for the same Clerk instance as the publishable key
- Android package is `com.brickval.app`
- If Clerk dashboard requires Android SHA/package registration, confirm the preview build matches that registration
- App callback scheme remains `brickval://`

- [ ] **Step 4: Decide the auth fix from evidence, not preference**

Use this decision table:

```text
If isLoaded never becomes true:
  Root cause is Clerk bootstrap/config, not the button handler.
  Fix key/env/build config first.

If startSSOFlow rejects immediately:
  Root cause is current auth flow or provider configuration.
  Compare current generic useSSO flow with Clerk's current native Google hook.

If browser/native UI opens but app never resumes:
  Root cause is callback/deep-link return path.
  Fix scheme / redirect handling in app config and resume path.

If createdSessionId exists but UI still shows signed out:
  Root cause is session activation or provider state propagation.
  Focus on setActive() completion and Clerk state refresh.
```

---

### Task 2: Implement the smallest Google sign-in fix that matches the evidence

**Files:**
- Modify: `brickval-mobile/app/account.tsx`
- Modify: `brickval-mobile/app/_layout.tsx`
- Modify: `brickval-mobile/app.json` only if callback config is proven broken
- Modify: `brickval-mobile/eas.json` only if build env is proven missing

- [ ] **Step 1: If the issue is flow-level, switch from generic SSO to Clerk's current Google-native path**

The current code uses:

```ts
const { startSSOFlow } = useSSO();
const { createdSessionId, setActive } = await startSSOFlow({ strategy: "oauth_google" });
```

If Task 1 shows the generic flow is the failure point, replace it with Clerk's current Google-specific native hook so Android uses the library's supported path directly.

Expected target shape:

```ts
import { useSignInWithGoogle } from "@clerk/expo/google";

const { startGoogleAuthenticationFlow } = useSignInWithGoogle();

const { createdSessionId, setActive } = await startGoogleAuthenticationFlow();

if (createdSessionId && setActive) {
  await setActive({ session: createdSessionId });
}
```

- [ ] **Step 2: If the issue is bootstrap-level, harden the account screen instead of firing sign-in too early**

If `isLoaded` is the blocker, do not allow sign-in attempts before Clerk is ready:

```ts
if (!isLoaded) {
  setErrorMessage("Account is still loading. Try again in a moment.");
  return;
}
```

Also change button state so the loading case is disabled, not actionable.

- [ ] **Step 3: If the issue is callback-level, fix resume config only where proven**

Only if Task 1 proves callback return is broken:

```json
{
  "expo": {
    "scheme": "brickval",
    "plugins": ["@clerk/expo", "expo-web-browser"]
  }
}
```

`WebBrowser.maybeCompleteAuthSession()` is already present in `app/_layout.tsx`, so do not add more redirect code unless evidence shows that line is not running at resume time.

- [ ] **Step 4: Verify the original symptom is gone**

Manual regression checklist in the same build type that failed before:

```text
1. Settings -> Open account
2. Confirm "Checking session..." resolves to either Signed out or signed-in email
3. Tap Google sign-in
4. Confirm browser/native Google UI opens
5. Complete sign-in
6. Confirm app returns to BrickVal
7. Confirm account card now shows signed-in email
8. Confirm getAuthToken() returns a non-null token when signed in
```

---

### Task 3: Fix condition-aware collection pricing at the source

**Files:**
- Modify: `brickval-mobile/lib/collection.ts`
- Modify: `brickval-mobile/components/ResultCard.tsx`
- Modify: `brickval-mobile/lib/api.ts`
- Modify: `brickval-mobile/app/(tabs)/index.tsx`
- Modify: `brickval-mobile/app/detail/[itemType]/[setNumber].tsx`

- [ ] **Step 1: Add a single condition-aware price selector**

Root cause found in `lib/collection.ts`: saved value always comes from `result.pricing.hero_new_avg_usd`, regardless of chosen condition.

Introduce one pure selector in `lib/collection.ts` and use it everywhere the chosen condition affects stored/displayed value:

```ts
function getConditionMarketValueUsd(
  result: LookupDetailResult,
  condition: CollectionCondition
): number | null {
  if (result.item_type === "minifig") {
    return condition === "used"
      ? result.pricing.used_sold_avg_usd ?? result.pricing.used_stock_avg_usd ?? null
      : result.pricing.new_sold_avg_usd ?? result.pricing.new_stock_avg_usd ?? null;
  }

  return condition === "used"
    ? result.pricing.bricklink_used_avg_usd ??
        result.pricing.ebay_used_avg_usd ??
        result.pricing.bricklink_stock_used_avg_usd ??
        null
    : result.pricing.bricklink_new_avg_usd ??
        result.pricing.ebay_new_avg_usd ??
        result.pricing.bricklink_stock_new_avg_usd ??
        null;
}
```

- [ ] **Step 2: Make the save sheet preview update when condition changes**

The current result sheet always uses `hero_new_avg_usd` for:

```ts
const target = result.pricing.hero_new_avg_usd ?? 0;
const collectionValue = hasPrice
  ? `$${Math.round((pricing.hero_new_avg_usd ?? 0) * quantity).toLocaleString()}`
  : "Unavailable";
```

Change only the save-preview math, not the main hero reveal. The hero card can stay on "new" market value per product spec, while the "Saved value" line must reflect the selected condition.

- [ ] **Step 3: Save condition-aware history, not just condition-aware unit price**

If we only change the stored unit price, the Home chart still uses blended market history and gives the wrong trend line for used items.

Add one selector that stores matching history rows:

```ts
function getConditionHistory(result: LookupDetailResult, condition: CollectionCondition): MarketHistoryPoint[] {
  if (result.item_type === "minifig") {
    const rows = condition === "used"
      ? result.pricing.sold_details
      : result.pricing.sold_new_details;
    return rows
      .filter((row) => row.date && Number.isFinite(row.price_usd))
      .map((row) => ({ date: row.date!, price_usd: row.price_usd, source: "bricklink" as const }));
  }

  const bricklinkRows = condition === "used"
    ? result.pricing.bricklink_sold_used_details
    : result.pricing.bricklink_sold_new_details;

  const ebayRows = condition === "used"
    ? result.pricing.ebay_used_sales
    : result.pricing.ebay_new_sales;

  return [
    ...bricklinkRows.map((row) => ({ date: row.date ?? "", price_usd: row.price_usd, source: "bricklink" as const })),
    ...ebayRows.map((row) => ({ date: row.sold_date ?? "", price_usd: row.price_usd, source: "ebay" as const })),
  ]
    .filter((row) => row.date && Number.isFinite(row.price_usd) && row.price_usd > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-120);
}
```

- [ ] **Step 4: Tighten the types so the bug cannot hide behind summary types**

`ResultCard` and `addToCollection()` currently accept `LookupSummaryResult`, but the scan screen actually passes full `LookupDetailResult` objects.

Change those signatures to the detailed type so condition-based selectors can read the right fields without fallback casting:

```ts
// components/ResultCard.tsx
result: LookupDetailResult | null;
onAddToCollection: (
  result: LookupDetailResult,
  options: { quantity: number; condition: CollectionCondition }
) => void;
```

```ts
// lib/collection.ts
export async function addToCollection(
  result: LookupDetailResult,
  options: AddToCollectionOptions
): Promise<CollectionItem[]>
```

- [ ] **Step 5: Verify the original pricing bug with the exact founder repro**

Manual regression checklist:

```text
1. Scan or open a set that has both new and used data
2. On the result sheet choose "New / sealed" and save
3. Confirm saved value matches the new-market path
4. Remove the item or use a different item id
5. Save the same item as "Used"
6. Confirm saved value is different and matches the used-market path
7. Open Home dashboard and confirm the stored total reflects the chosen condition
8. Open the item detail page and confirm condition label and unit value agree
```

---

### Task 4: Clean verification and handoff

**Files:**
- Modify: only files changed in Tasks 2 and 3

- [ ] **Step 1: Remove temporary auth instrumentation**

Delete any temporary `console.log()` lines used only for Task 1 diagnosis.

- [ ] **Step 2: Run the narrowest available verification**

Because the app currently has no native automated test setup, verification is command + manual-flow based:

```bash
cd /Users/holamchan/brickval/brickval-mobile
npx tsc --noEmit
```

Then re-run the two manual bug checklists from Tasks 2 and 3 in the build type that originally failed.

- [ ] **Step 3: Report outcomes separately**

Handoff format:

```text
Bug 1: Google sign-in
- Root cause:
- Fix applied:
- Verified in:

Bug 2: Condition pricing
- Root cause:
- Fix applied:
- Verified in:
```
