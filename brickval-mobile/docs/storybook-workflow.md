# Storybook Workflow

Use Storybook for UI draft work before wiring screens into the app.

## Start it

From `brickval-mobile/`:

```bash
npm run storybook
```

Open:

```text
http://localhost:6006
```

## What it is for

- Draft component states in isolation
- Review layout, spacing, color, and copy before app integration
- Save edge cases as stories instead of reproducing them manually in the app
- Give Codex a live UI knowledge source through Storybook MCP

## Where stories live

Stories are colocated next to components:

```text
components/*.stories.tsx
```

Current starter coverage:

- `ScanIntentPicker`
- `TopBar`
- `LegoLoaderNative`
- `QuestionMarkPlaceholder`
- `MarketRowsTable`
- `DetectionOverlay`
- `PrePurchaseDisclosure`
- `ResultCard`

## MCP endpoint

When Storybook is running, the MCP server is available at:

```text
http://127.0.0.1:6006/mcp
```

It has already been registered for Codex as `brickval-storybook`.

## Recommended workflow

1. Build or update a component story first.
2. Review the state in Storybook.
3. Iterate on props, spacing, motion, and copy there.
4. Only then move the final version into the app flow.

## Notes

- Static Storybook build works with `npm run build-storybook`.
- Live Storybook dev server is working.
- Storybook Vitest integration is partially wired but still blocked by an Expo dependency optimization issue in `expo-modules-core`. Use Storybook visually for now; component test automation is the next fix.
