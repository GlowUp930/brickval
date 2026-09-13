import CoreGraphics
import Testing
@testable import BrickVal

struct BulkPriceTagLayoutTests {
    @Test
    func densityShrinksAsFigureCountRises() {
        #expect(BulkPriceTagDensity.forResultCount(2, accessibilitySize: false) == .regular)
        #expect(BulkPriceTagDensity.forResultCount(10, accessibilitySize: false) == .regular)
        #expect(BulkPriceTagDensity.forResultCount(30, accessibilitySize: false) == .compact)
        #expect(BulkPriceTagDensity.forResultCount(60, accessibilitySize: false) == .micro)
    }

    @Test(arguments: [2, 10, 30, 60])
    func placesEveryFigureInsideTheStageWithoutDuplicateIDs(_ count: Int) {
        let items = makeItems(count: count)
        let stage = CGRect(x: 0, y: 0, width: 390, height: 700)
        let reserved = [CGRect(x: 8, y: 8, width: 374, height: 70),
                        CGRect(x: 0, y: 550, width: 390, height: 150)]
        let placements = BulkPriceTagPlacementPlanner.placements(
            for: items,
            in: stage,
            reservedRects: reserved,
            minimumSpacing: 4
        )

        #expect(placements.count == count)
        #expect(Set(placements.map(\.id)).count == count)
        #expect(placements.allSatisfy { stage.contains($0.frame) })
        #expect(placements.allSatisfy { placement in
            reserved.allSatisfy { !placement.frame.intersects($0) }
        })
        #expect(placements.allSatisfy { $0.labelAnchor.x >= $0.frame.minX && $0.labelAnchor.x <= $0.frame.maxX })
        #expect(placements.allSatisfy { $0.labelAnchor.y >= $0.frame.minY && $0.labelAnchor.y <= $0.frame.maxY })
        #expect(placements.allSatisfy { !$0.requiresLeaderLine })
        for (index, placement) in placements.enumerated() {
            for other in placements.dropFirst(index + 1) {
                #expect(!placement.frame.insetBy(dx: -2, dy: -2).intersects(other.frame.insetBy(dx: -2, dy: -2)))
            }
        }
    }

    @Test
    func keepsPlacementOrderAndCoordinatesStableForTheSameInput() {
        let items = makeItems(count: 30)
        let stage = CGRect(x: 0, y: 0, width: 390, height: 700)
        let first = BulkPriceTagPlacementPlanner.placements(for: items, in: stage)
        let second = BulkPriceTagPlacementPlanner.placements(for: items, in: stage)

        #expect(first == second)
        #expect(first.map(\.id) == items.map(\.id))
    }

    @Test
    func denseResultsUseMicroDensityAndKeepEveryPriceVisible() {
        let items = makeItems(count: 60).map {
            BulkPriceTagLayoutItem(
                id: $0.id,
                number: $0.number,
                anchor: $0.anchor,
                obstacle: $0.obstacle,
                text: $0.text,
                density: .micro
            )
        }
        let reserved = [CGRect(x: 0, y: 0, width: 220, height: 54)]
        let placements = BulkPriceTagPlacementPlanner.placements(
            for: items,
            in: CGRect(x: 0, y: 0, width: 220, height: 300),
            reservedRects: reserved,
            minimumSpacing: 4
        )

        #expect(placements.count == 60)
        #expect(placements.allSatisfy { $0.density == .micro })
        #expect(placements.allSatisfy { !$0.isCollapsed })
        #expect(placements.allSatisfy { $0.frame.width >= 28 && $0.frame.height >= 17 })
        #expect(placements.allSatisfy { placement in
            reserved.allSatisfy { !placement.frame.intersects($0) }
        })
        for (index, placement) in placements.enumerated() {
            for other in placements.dropFirst(index + 1) {
                #expect(!placement.frame.insetBy(dx: -2, dy: -2).intersects(other.frame.insetBy(dx: -2, dy: -2)))
            }
        }
    }

    @Test
    func pricesStayAnchoredToTheirFiguresWithoutLeaderLines() {
        let item = BulkPriceTagLayoutItem(
            id: "figure-1",
            number: 1,
            anchor: CGPoint(x: 195, y: 350),
            obstacle: CGRect(x: 185, y: 325, width: 20, height: 50),
            text: "$12.34",
            density: .regular
        )
        let placement = try! #require(
            BulkPriceTagPlacementPlanner.placements(
                for: [item],
                in: CGRect(x: 0, y: 0, width: 390, height: 700)
            ).first
        )

        let edgeDistance = min(
            abs(placement.labelAnchor.x - placement.frame.minX),
            abs(placement.labelAnchor.x - placement.frame.maxX),
            abs(placement.labelAnchor.y - placement.frame.minY),
            abs(placement.labelAnchor.y - placement.frame.maxY)
        )
        #expect(edgeDistance < 0.001)
        #expect(!placement.requiresLeaderLine)
        #expect(abs(placement.frame.midX - item.obstacle.midX) <= item.obstacle.width)
    }

    private func makeItems(count: Int) -> [BulkPriceTagLayoutItem] {
        (0 ..< count).map { index in
            let column = index % 6
            let row = index / 6
            let anchor = CGPoint(x: 34 + CGFloat(column) * 62, y: 130 + CGFloat(row) * 54)
            return BulkPriceTagLayoutItem(
                id: "figure-\(index)",
                number: index + 1,
                anchor: anchor,
                obstacle: CGRect(x: anchor.x - 10, y: anchor.y - 14, width: 20, height: 28),
                text: "$\(index + 2).34",
                density: .forResultCount(count, accessibilitySize: false)
            )
        }
    }
}
