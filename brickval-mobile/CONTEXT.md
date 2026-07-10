# BrickVal

BrickVal is a LEGO valuation and collection context. It defines how collectors scan, value, and track collectible LEGO items.

## Language

**Market Snapshot**:
The latest display-ready valuation for one collectible in one condition, including price, source, confidence, and when the valuation was last updated.
_Avoid_: API cache, cached lookup, price cache

**Price Signal**:
The user-facing explanation for why a Market Snapshot is believable, including source type, source name, confidence, and when the source was last updated.
_Avoid_: Source badge, trust badge

**Collection Quantity**:
The count of the same collectible in the same condition and color that a collector owns. Adding the same collectible again increases this count instead of replacing the existing entry.
_Avoid_: Duplicate item, repeated row

**Review Bulk Scan**:
A scan result that contains multiple detected collectibles and requires the collector to confirm which matches should be priced or added.
_Avoid_: Auto-add bulk scan, bulk import

**Scan Session**:
The complete camera-to-review workflow for one captured image, including access validation, identification, market lookup, timing, and a review-ready outcome.
_Avoid_: Scan handler, camera request chain
