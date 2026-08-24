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
        #expect(session.phase == .sweeping(index: 0))
        #expect(session.currentEntry?.id == "left-top")
        session.commitSweepStep()
        #expect(session.revealedCount == 1)
        #expect(session.lastRevealedEntryID == "left-top")
        #expect(session.pricedCount == 1)
        #expect(session.revealedTotal == 2)
        #expect(session.phase == .sweeping(index: 1))
        #expect(session.currentEntry?.id == "right-top")
    }

    @Test
    func sweepCadenceScalesForDenseLots() {
        #expect(BulkRevealSession.stepInterval(for: 3) == 0.70)
        #expect(BulkRevealSession.stepInterval(for: 10) == 0.60)
        #expect(BulkRevealSession.stepInterval(for: 40) == 0.50)

        var session = BulkRevealSession(items: (0..<40).map { index in
            fixture(id: "figure-\(index)", x: Double(index % 8) / 8, y: Double(index / 8) / 5, used: 1)
        })
        #expect(session.duration <= BulkRevealSession.maximumDuration)
        session.begin()
        for _ in 0..<40 { session.commitSweepStep() }
        #expect(session.isComplete)
        #expect(session.revealedCount == 40)
        #expect(session.revealedTotal == 40)
    }

    @Test
    func supportedLotSizesRevealEveryEntry() {
        for count in [1, 10, 40, 50] {
            var session = BulkRevealSession(items: (0..<count).map { index in
                fixture(
                    id: "figure-\(index)",
                    x: Double(index % 10) / 10,
                    y: Double(index / 10) / 5,
                    used: 1
                )
            })

            session.begin()
            for _ in 0..<count {
                session.commitSweepStep()
            }

            #expect(session.isComplete)
            #expect(session.revealedCount == count)
        }
    }

    @Test
    func resetStartsARevealedSessionOverWithoutNetworkState() {
        var session = BulkRevealSession(items: [
            fixture(id: "one", x: 0.1, y: 0.1, used: 2),
            fixture(id: "two", x: 0.5, y: 0.1, used: 3)
        ])

        session.begin()
        session.commitSweepStep()
        #expect(session.revealedCount == 1)
        #expect(session.revealedTotal == 2)

        session.reset()
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

    @Test
    func waitsForTheNextSpatialFigureWhenParallelLookupFinishesOutOfOrder() {
        let first = fixture(id: "first", x: 0.10, y: 0.10, used: 2)
        let second = fixture(id: "second", x: 0.60, y: 0.10, used: 3)
        var session = BulkRevealSession(
            regions: [
                BulkScanRegion(regionId: first.id, boundingBox: first.boundingBox!),
                BulkScanRegion(regionId: second.id, boundingBox: second.boundingBox!)
            ]
        )

        session.begin()
        session.resolve(second)
        session.commitSweepStep()
        #expect(session.revealedCount == 0)

        session.resolve(first)
        session.commitSweepStep()
        #expect(session.revealedCount == 1)
        #expect(session.currentEntry?.id == second.id)
    }

    @Test
    func unresolvedFigureStillAdvancesTheReveal() {
        let item = fixture(id: "resolved", x: 0.10, y: 0.10, used: 2)
        var session = BulkRevealSession(
            regions: [
                BulkScanRegion(regionId: "missed", boundingBox: NormalizedBoundingBox(x: 0.1, y: 0.1, width: 0.2, height: 0.3)),
                BulkScanRegion(regionId: item.id, boundingBox: NormalizedBoundingBox(x: 0.5, y: 0.1, width: 0.2, height: 0.3))
            ],
            items: [item]
        )

        session.begin()
        session.markUnresolved("missed")
        session.commitSweepStep()
        #expect(session.revealedCount == 1)
        #expect(session.currentEntry?.id == item.id)
    }

    @Test
    func unavailablePriceIsVisibleButExcludedFromPricedTotal() {
        var session = BulkRevealSession(items: [
            fixture(id: "priced", x: 0.1, y: 0.1, used: 6),
            fixture(id: "unavailable", x: 0.5, y: 0.1, used: nil, new: nil)
        ])

        session.begin()
        session.commitSweepStep()
        session.commitSweepStep()

        #expect(session.isComplete)
        #expect(session.lastRevealedEntryID == "unavailable")
        #expect(session.pricedCount == 1)
        #expect(session.revealedTotal == 6)
        #expect(session.entries.last?.value(for: .used) == nil)
    }

    private func fixture(
        id: String,
        x: Double,
        y: Double,
        used: Double?,
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
