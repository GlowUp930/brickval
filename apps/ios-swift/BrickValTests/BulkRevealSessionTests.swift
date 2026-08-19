import Foundation
import Testing
@testable import BrickVal

struct BulkRevealSessionTests {
    @Test
    func ordersFiguresSpatiallyAndRevealsTheirUsedValue() {
        let items = [
            fixture(id: "right-top", x: 0.60, y: 0.10, used: 4.0),
            fixture(id: "left-bottom", x: 0.10, y: 0.65, used: 8.0),
            fixture(id: "left-top", x: 0.10, y: 0.12, used: 2.0)
        ]

        var session = BulkRevealSession(items: items)
        #expect(session.entries.map(\.id) == ["left-top", "right-top", "left-bottom"])
        #expect(session.phase == .preparing)

        session.begin()
        #expect(session.activeEntry?.id == "left-top")
        session.commitActiveEntry()
        #expect(session.revealedCount == 1)
        #expect(session.revealedTotal == 2)
        #expect(session.activeEntry?.id == "right-top")
    }

    @Test
    func skipCompletesAllEntriesAndReplayResetsWithoutNetworkState() {
        var session = BulkRevealSession(items: [
            fixture(id: "one", x: 0.1, y: 0.1, used: 2),
            fixture(id: "two", x: 0.5, y: 0.1, used: 3)
        ])

        session.begin()
        session.skip()
        #expect(session.isComplete)
        #expect(session.revealedCount == 2)
        #expect(session.revealedTotal == 5)

        session.replay()
        #expect(session.phase == .preparing)
        #expect(session.revealedCount == 0)
        #expect(session.revealedTotal == 0)
    }

    @Test
    func changingConditionRecalculatesRevealTotal() {
        var session = BulkRevealSession(items: [
            fixture(id: "one", x: 0.1, y: 0.1, used: 4, new: 10)
        ])

        session.begin()
        session.commitActiveEntry()
        #expect(session.revealedTotal == 4)

        session.setCondition(.newSealed)
        #expect(session.revealedTotal == 10)
    }

    private func fixture(
        id: String,
        x: Double,
        y: Double,
        used: Double,
        new: Double? = nil
    ) -> BulkScanResultItem {
        let result = LookupResult(
            identifier: id,
            itemType: .minifig,
            name: "Figure \(id)",
            theme: "BrickValue",
            pieces: nil,
            yearReleased: 2024,
            isObsolete: nil,
            imageURL: nil,
            pricing: LookupPricing(
                heroNewAverageUSD: new,
                rrpUSD: nil,
                gainPercent: nil,
                dataSource: "sold",
                newSoldAverageUSD: new,
                usedSoldAverageUSD: used,
                newStockAverageUSD: nil,
                usedStockAverageUSD: nil,
                brickLinkNewAverageUSD: nil,
                brickLinkUsedAverageUSD: nil
            ),
            marketHistory: [],
            colorID: nil,
            colorName: nil
        )
        return BulkScanResultItem(
            id: id,
            result: result,
            boundingBox: NormalizedBoundingBox(x: x, y: y, width: 0.2, height: 0.3),
            confidence: 0.94
        )
    }
}
