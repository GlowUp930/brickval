import CoreGraphics

enum BulkPriceTagDensity: Equatable {
    case regular
    case compact
    case micro

    var fontSize: CGFloat {
        switch self {
        case .regular: 12
        case .compact: 10.5
        case .micro: 8.5
        }
    }

    var horizontalPadding: CGFloat {
        switch self {
        case .regular: 9
        case .compact: 6
        case .micro: 4
        }
    }

    var verticalPadding: CGFloat {
        switch self {
        case .regular: 5
        case .compact: 4
        case .micro: 2.5
        }
    }

    var height: CGFloat {
        switch self {
        case .regular: 28
        case .compact: 23
        case .micro: 17
        }
    }

    /// The smallest full-price chip used when the photo is too dense for the
    /// natural text width. The price remains visible; it is never replaced by
    /// a numbered marker.
    var compressedWidth: CGFloat {
        switch self {
        case .regular: 44
        case .compact: 36
        case .micro: 28
        }
    }

    var minimumWidth: CGFloat {
        switch self {
        case .regular: 48
        case .compact: 38
        case .micro: 28
        }
    }

    static func forResultCount(
        _ count: Int,
        accessibilitySize: Bool,
        availableArea: CGFloat? = nil
    ) -> Self {
        let safeCount = max(count, 0)
        let areaPerResult = availableArea.map {
            $0 / CGFloat(max(safeCount, 1))
        } ?? .greatestFiniteMagnitude

        if accessibilitySize {
            return safeCount > 24 ? .compact : .regular
        }

        // Count gives a predictable baseline while the available photo area
        // adapts the same scan for small and large layouts.
        if safeCount > 30 || areaPerResult < 1_400 {
            return .micro
        }
        if safeCount > 12 || areaPerResult < 3_000 {
            return .compact
        }
        return .regular
    }
}

struct BulkPriceTagLayoutItem: Identifiable, Equatable {
    let id: String
    let number: Int
    let anchor: CGPoint
    let obstacle: CGRect
    let text: String
    let density: BulkPriceTagDensity
}

struct BulkPriceTagPlacement: Identifiable, Equatable {
    let id: String
    let number: Int
    let anchor: CGPoint
    let frame: CGRect
    let density: BulkPriceTagDensity
    // Kept for compatibility with existing fixtures. Completed results now
    // always render their full price text, so new placements are never
    // collapsed to a marker.
    let isCollapsed: Bool

    var labelAnchor: CGPoint {
        let x = anchor.x.clamped(to: frame.minX ... frame.maxX)
        let y = anchor.y.clamped(to: frame.minY ... frame.maxY)
        let distances = [
            (CGPoint(x: x, y: frame.minY), abs(anchor.y - frame.minY)),
            (CGPoint(x: x, y: frame.maxY), abs(anchor.y - frame.maxY)),
            (CGPoint(x: frame.minX, y: y), abs(anchor.x - frame.minX)),
            (CGPoint(x: frame.maxX, y: y), abs(anchor.x - frame.maxX)),
        ]
        return distances.min { $0.1 < $1.1 }?.0 ?? frame.center
    }

    var requiresLeaderLine: Bool {
        hypot(labelAnchor.x - anchor.x, labelAnchor.y - anchor.y) > 12
    }
}

enum BulkPriceTagPlacementPlanner {
    static func estimatedSize(text: String, density: BulkPriceTagDensity) -> CGSize {
        // The deliberately generous glyph estimate keeps the visual chip inside the
        // rectangle used by the collision planner even when a localized amount is wider.
        let glyphWidth = density.fontSize * 0.70
        let width = max(
            density.minimumWidth,
            CGFloat(max(text.count, 1)) * glyphWidth + density.horizontalPadding * 2
        )
        return CGSize(width: width, height: density.height)
    }

    private static func compressedSize(
        _ naturalSize: CGSize,
        density: BulkPriceTagDensity
    ) -> CGSize {
        CGSize(
            width: max(density.minimumWidth, min(naturalSize.width, density.compressedWidth)),
            height: density == .micro ? 17 : max(20, density.height - 2)
        )
    }

    static func placements(
        for items: [BulkPriceTagLayoutItem],
        in contentRect: CGRect,
        reservedRects: [CGRect] = [],
        minimumSpacing: CGFloat = 4
    ) -> [BulkPriceTagPlacement] {
        guard !items.isEmpty, contentRect.width > 0, contentRect.height > 0 else { return [] }

        let order = Dictionary(uniqueKeysWithValues: items.enumerated().map { ($1.id, $0) })
        let orderedItems = items.sorted {
            if $0.density == .regular, $1.density != .regular { return true }
            if $1.density == .regular, $0.density != .regular { return false }
            return (order[$0.id] ?? 0) < (order[$1.id] ?? 0)
        }

        let obstacles = items.map { $0.obstacle.insetBy(dx: -minimumSpacing, dy: -minimumSpacing) }
        var occupied = reservedRects.map { $0.insetBy(dx: -minimumSpacing / 2, dy: -minimumSpacing / 2) }
        var placements: [BulkPriceTagPlacement] = []
        let areaPerItem = contentRect.width * contentRect.height / CGFloat(max(items.count, 1))
        let useCompressedMicroTags = areaPerItem < 1_400

        for item in orderedItems {
            let naturalSize = estimatedSize(text: item.text, density: item.density)
            let size = item.density == .micro && useCompressedMicroTags
                ? compressedSize(naturalSize, density: item.density)
                : naturalSize
            let preferredCandidates = candidates(
                for: item,
                size: size,
                in: contentRect,
                minimumSpacing: minimumSpacing
            )
            let laneCandidates = gridCandidates(
                size: size,
                in: contentRect,
                anchor: item.anchor,
                spacing: minimumSpacing
            )
            let strictCandidates = preferredCandidates + laneCandidates
            let chosen = strictCandidates.first {
                isFree($0, from: occupied + obstacles)
            }
                // If the photo is crowded with figures, place the full price
                // in a free lane rather than hiding it behind a marker. A
                // leader line keeps the relationship to its figure clear.
                ?? laneCandidates.first { isFree($0, from: occupied) }
                ?? compressedLaneCandidate(
                    for: item,
                    naturalSize: size,
                    in: contentRect,
                    occupied: occupied,
                    minimumSpacing: minimumSpacing
                )

            if let chosen {
                occupied.append(chosen.insetBy(dx: -minimumSpacing / 2, dy: -minimumSpacing / 2))
                placements.append(
                    BulkPriceTagPlacement(
                        id: item.id,
                        number: item.number,
                        anchor: item.anchor,
                        frame: chosen,
                        density: item.density,
                        isCollapsed: false
                    )
                )
                continue
            }

            // A pathological layout can exhaust every lane. Keep the result
            // present with the smallest complete-price chip and choose the
            // least-overlapping bounded location instead of dropping it.
            let fallbackSize = compressedSize(size, density: item.density)
            let fallbackCandidates = gridCandidates(
                size: fallbackSize,
                in: contentRect,
                anchor: item.anchor,
                spacing: minimumSpacing
            )
            let fallback = fallbackCandidates.min {
                overlapScore($0, with: occupied) < overlapScore($1, with: occupied)
            } ?? clampedFrame(
                CGRect(
                    x: item.anchor.x - fallbackSize.width / 2,
                    y: item.anchor.y - fallbackSize.height / 2,
                    width: fallbackSize.width,
                    height: fallbackSize.height
                ),
                to: contentRect
            )

            occupied.append(fallback.insetBy(dx: -minimumSpacing / 2, dy: -minimumSpacing / 2))
            placements.append(
                BulkPriceTagPlacement(
                    id: item.id,
                    number: item.number,
                    anchor: item.anchor,
                    frame: fallback,
                    density: item.density,
                    isCollapsed: false
                )
            )
        }

        return placements.sorted { (order[$0.id] ?? 0) < (order[$1.id] ?? 0) }
    }

    private static func candidates(
        for item: BulkPriceTagLayoutItem,
        size: CGSize,
        in contentRect: CGRect,
        minimumSpacing: CGFloat
    ) -> [CGRect] {
        let anchor = item.anchor
        let gap = minimumSpacing + 4
        let preferred: [CGRect] = [
            CGRect(x: anchor.x - size.width / 2, y: anchor.y - size.height - gap, width: size.width, height: size.height),
            CGRect(x: anchor.x - size.width / 2, y: anchor.y + gap, width: size.width, height: size.height),
            CGRect(x: anchor.x + gap, y: anchor.y - size.height / 2, width: size.width, height: size.height),
            CGRect(x: anchor.x - size.width - gap, y: anchor.y - size.height / 2, width: size.width, height: size.height),
        ]

        let perimeter = perimeterCandidates(size: size, in: contentRect, anchor: anchor, spacing: minimumSpacing)
        return (preferred + perimeter).map { clampedFrame($0, to: contentRect) }
    }

    private static func gridCandidates(
        size: CGSize,
        in rect: CGRect,
        anchor: CGPoint,
        spacing: CGFloat
    ) -> [CGRect] {
        let xStep = max(size.width + spacing, 1)
        let yStep = max(size.height + spacing, 1)
        var candidates: [(CGRect, CGFloat)] = []
        var y = rect.minY
        while y <= rect.maxY - size.height + 0.5 {
            var x = rect.minX
            while x <= rect.maxX - size.width + 0.5 {
                let frame = CGRect(x: x, y: y, width: size.width, height: size.height)
                candidates.append((frame, hypot(frame.midX - anchor.x, frame.midY - anchor.y)))
                x += xStep
            }
            y += yStep
        }
        return candidates.sorted { $0.1 < $1.1 }.map(\.0)
    }

    private static func perimeterCandidates(
        size: CGSize,
        in rect: CGRect,
        anchor: CGPoint,
        spacing: CGFloat
    ) -> [CGRect] {
        var candidates: [(CGRect, CGFloat)] = []
        let xStep = max(size.width + spacing, 1)
        let yStep = max(size.height + spacing, 1)

        var x = rect.minX
        while x <= rect.maxX - size.width + 0.5 {
            let top = CGRect(x: x, y: rect.minY, width: size.width, height: size.height)
            let bottom = CGRect(x: x, y: rect.maxY - size.height, width: size.width, height: size.height)
            candidates.append((top, abs(top.midX - anchor.x) + abs(top.midY - anchor.y)))
            candidates.append((bottom, abs(bottom.midX - anchor.x) + abs(bottom.midY - anchor.y)))
            x += xStep
        }

        var y = rect.minY
        while y <= rect.maxY - size.height + 0.5 {
            let left = CGRect(x: rect.minX, y: y, width: size.width, height: size.height)
            let right = CGRect(x: rect.maxX - size.width, y: y, width: size.width, height: size.height)
            candidates.append((left, abs(left.midX - anchor.x) + abs(left.midY - anchor.y)))
            candidates.append((right, abs(right.midX - anchor.x) + abs(right.midY - anchor.y)))
            y += yStep
        }

        return candidates.sorted { $0.1 < $1.1 }.map(\.0)
    }

    private static func compressedLaneCandidate(
        for item: BulkPriceTagLayoutItem,
        naturalSize: CGSize,
        in rect: CGRect,
        occupied: [CGRect],
        minimumSpacing: CGFloat
    ) -> CGRect? {
        let size = compressedSize(naturalSize, density: item.density)
        let candidates = gridCandidates(
            size: size,
            in: rect,
            anchor: item.anchor,
            spacing: minimumSpacing
        )
        return candidates.first { isFree($0, from: occupied) }
    }

    private static func isFree(_ frame: CGRect, from occupied: [CGRect]) -> Bool {
        !occupied.contains { frame.intersects($0) }
    }

    private static func overlapScore(_ frame: CGRect, with occupied: [CGRect]) -> CGFloat {
        occupied.reduce(0) { score, other in
            let intersection = frame.intersection(other)
            guard !intersection.isNull else { return score }
            return score + intersection.width * intersection.height
        }
    }

    private static func clampedFrame(_ frame: CGRect, to rect: CGRect) -> CGRect {
        let width = min(frame.width, rect.width)
        let height = min(frame.height, rect.height)
        let x = min(max(frame.minX, rect.minX), rect.maxX - width)
        let y = min(max(frame.minY, rect.minY), rect.maxY - height)
        return CGRect(x: x, y: y, width: width, height: height)
    }
}

private extension CGFloat {
    func clamped(to range: ClosedRange<Self>) -> Self {
        Swift.min(Swift.max(self, range.lowerBound), range.upperBound)
    }
}

private extension CGRect {
    var center: CGPoint { CGPoint(x: midX, y: midY) }
}
