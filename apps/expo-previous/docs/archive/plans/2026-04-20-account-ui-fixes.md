# Account UI Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the native account screen so Clerk's inline auth UI is fully visible and stays usable when the Android keyboard opens.

**Architecture:** Keep the change inside the existing native account route. Allocate the Clerk auth view enough vertical space from the current viewport, and wrap the screen in keyboard-aware layout so focused auth inputs are not hidden behind the software keyboard.

**Tech Stack:** Expo Router, React Native, `@clerk/expo/native`

---

### Task 1: Fix account screen layout

**Files:**
- Modify: `app/account.tsx`
- Reference: `AGENTS.md`

- [ ] **Step 1: Confirm the failing UI states**

Use the screenshots and current code to verify the two failures:

```tsx
<View style={styles.authCard}>
  <AuthView mode="signInOrUp" />
</View>
```

```ts
authCard: {
  minHeight: 420,
  borderRadius: 8,
  overflow: "hidden",
}
```

Expected problem: Clerk's native auth view is clipped because the container height is fixed too low for the full sign-in UI, and the screen has no keyboard-avoidance wrapper.

- [ ] **Step 2: Allocate enough height to the auth panel**

Update `app/account.tsx` to derive the auth panel height from the screen height and apply it to the auth card:

```tsx
const { height: windowHeight } = useWindowDimensions();
const authCardMinHeight = Math.max(500, Math.round(windowHeight * 0.64));
```

```tsx
<View style={[styles.authCard, { minHeight: authCardMinHeight }]}>
  <AuthView mode="signInOrUp" />
</View>
```

Expected result: the Google/login section is no longer clipped into the narrow strip shown below the "or" divider.

- [ ] **Step 3: Add keyboard-aware layout**

Wrap the screen in `KeyboardAvoidingView` and make the scroll view tap-safe:

```tsx
<KeyboardAvoidingView
  style={styles.root}
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0}
>
  <ScrollView
    keyboardShouldPersistTaps="handled"
    contentContainerStyle={styles.content}
  >
```

Expected result: when the email field is focused, the content shifts and remains scrollable above the Android keyboard instead of getting covered.

- [ ] **Step 4: Keep content scrollable after resize**

Make the scroll content fill available height so keyboard resize and tall auth content work together:

```ts
content: {
  flexGrow: 1,
  padding: 20,
  paddingTop: 56,
  paddingBottom: 96,
  gap: 18,
}
```

Expected result: the screen keeps a stable layout at rest and can scroll naturally once the keyboard or taller auth content reduces the viewport.

- [ ] **Step 5: Verify**

Run:

```bash
cd /Users/holamchan/brickval/brickval-mobile
npx tsc --noEmit
```

Expected: TypeScript completes without new errors from `app/account.tsx`.

Manual check on Android preview build:
- Open `Account`
- Confirm the auth panel renders the full sign-in area instead of a clipped strip under `or`
- Tap the email field and confirm the keyboard does not cover the active auth container
