import CoreGraphics

enum BulkPriceTagDensity: Equatable {
    case regular
    case compact
    case micro

    var fontSize: CGFloat {
        switch self {
        case .regular: 12
        case .compact: 11
        case .micro: 9
        }
    }

    var horizontalPadding: CGFloat {
        switch self {
        case .regular: 9
        case .compact: 7
        case .micro: 5
        }
    }

    var verticalPadding: CGFloat {
        switch self {
        case .regular: 5
        case .compact: 4
        case .micro: 3
        }
    }

    var height: CGFloat {
        switch self {
        case .regular: 28
        case .compact: 24
        case .micro: 19
        }
    }

    var markerSize: CGFloat {
        switch self {
        case .regular: 24
        case .compact: 22
        case .micro: 20
        }
    }

    var minimumWidth: CGFloat {
        switch self {
        case .regular: 48
        case .compact: 42
        case .micro: 34
        }
    }

    static func forResultCount(_ count: Int, accessibilitySize: Bool) -> Self {
        if accessibilitySize {
            return count > 24 ? .compact : .regular
        }
        switch count {
        case ...12: return .regular
        case 13...30: return .compact
        default: return .micro
        }
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
}

enum BulkPriceTagPlacementPlanner {
    static func estimatedSize(text: String, density: BulkPriceTagDensity) -> CGSize {
        // The deliberately generous glyph estimate keeps the visual chip inside the
        // rectangle used by the collision planner even when a localized amount is wider.
        let glyphWidth = density.fontSize * 0.72
        let width = max(
            density.minimumWidth,
            CGFloat(max(text.count, 1)) * glyphWidth + density.horizontalPadding * 2
        )
        return CGSize(width: width, height: density.height)
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
        occupied.append(contentsOf: obstacles)
        var placements: [BulkPriceTagPlacement] = []

        for item in orderedItems {
            let size = estimatedSize(text: item.text, density: item.density)
            let candidates = candidates(
                for: item,
                size: size,
                in: contentRect,
                minimumSpacing: minimumSpacing
            )
            let chosen = candidates.first { isFree($0, from: occupied) }

            if let chosen {
                occupied.append(chosen.insetBy(dx: -minimumSpacing / 2, dy: -minimumSpacing / 2))
                placements.append(
                    BulkPriceTagPlacement(
                        id: item.id,
                        number: item.number,
                        anchor: item.anchor,
                        frame: chosen,
                        density: item.density,
                        // At extreme density the map stays legible by showing a
                        // numbered marker. Selecting that marker promotes it to a
                        // regular full-price callout in the next layout pass.
                        isCollapsed: item.density == .micro
                    )
                )
                continue
            }

            let markerSize = CGSize(width: item.density.markerSize, height: item.density.markerSize)
            let marker = markerCandidates(
                for: item.anchor,
                size: markerSize,
                in: contentRect,
                minimumSpacing: minimumSpacing
            ).first { isFree($0, from: occupied) }
                ?? clampedFrame(
                    CGRect(
                        x: item.anchor.x - markerSize.width / 2,
                        y: item.anchor.y - markerSize.height / 2,
                        width: markerSize.width,
                        height: markerSize.height
                    ),
                    to: contentRect
                )

            occupied.append(marker.insetBy(dx: -minimumSpacing / 2, dy: -minimumSpacing / 2))
            placements.append(
                BulkPriceTagPlacement(
                    id: item.id,
                    number: item.number,
                    anchor: item.anchor,
                    frame: marker,
                    density: item.density,
                    isCollapsed: true
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

    private static func markerCandidates(
        for anchor: CGPoint,
        size: CGSize,
        in rect: CGRect,
        minimumSpacing: CGFloat
    ) -> [CGRect] {
        let xStep = max(size.width + minimumSpacing, 1)
        let yStep = max(size.height + minimumSpacing, 1)
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

    private static func isFree(_ frame: CGRect, from occupied: [CGRect]) -> Bool {
        !occupied.contains { frame.intersects($0) }
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
