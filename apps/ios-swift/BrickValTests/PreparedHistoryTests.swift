import Foundation
import Testing
@testable import BrickVal

@MainActor
struct PreparedHistoryTests {
    @Test func preparedWindowsMatchRealHistoryAndTrackQuantityRemovalAndRestart() async throws {
        let repository = CollectionRepository(fileURL: URL.temporaryDirectory.appending(path: UUID().uuidString))
        let store = CollectionStore(repository: repository)
        var joker = CollectionItem(setNumber: "70919", itemType: .set, name: "Joker", theme: "Batman")
        joker.marketSales = CollectionHistoryDemo.joker
        joker.alternateMarketSales = [
            CollectionMarketSale(date: "2026-09-03T12:00:00Z", priceUSD: 42, quantity: 2)
        ]
        var rocket = CollectionItem(setNumber: "21367", itemType: .set, name: "Rocket", theme: "Ideas", condition: .used)
        rocket.marketSales = CollectionHistoryDemo.rocket
        try await store.add([joker, rocket], isPro: true)
        store.prepareHistoryIfNeeded(force: true, now: CollectionHistoryDemo.referenceDate)
        await store.waitForPreparedHistory()
        for horizon in PortfolioHorizon.allCases {
            let expected = PortfolioHistoryBuilder.marketHistory(items: store.items, horizon: horizon, now: CollectionHistoryDemo.referenceDate)
            #expect(store.preparedHistory.portfolios[.all]?[horizon]?.points.map(\.value) == expected.points.map(\.value))
            #expect(store.preparedHistory.items[joker.id]?[.all]?[horizon] != store.preparedHistory.items[rocket.id]?[.all]?[horizon])
            #expect(store.preparedHistory.snapshots[joker.id]?[.all]?[horizon] != nil)
        }
        let jokerUsed = DetailConditionOption.used.collectionItem(from: joker)
        #expect(store.preparedHistory.snapshots[jokerUsed.id]?[.all]?[.month]?.timesSold == 1)
        #expect(store.preparedHistory.snapshots[jokerUsed.id]?[.all]?[.month]?.totalQuantity == 2)
        // Several mutations while background work is active must only publish the latest state.
        try await store.setQuantity(4, for: joker, isPro: true)
        try await store.remove(rocket)
        await store.waitForPreparedHistory()
        #expect(store.preparedHistory.items[rocket.id] == nil)
        #expect(store.preparedHistory.portfolios[.all]?[.month]?.points.last?.value == CollectionHistoryDemo.joker[0].priceUSD * 4)
        let restarted = CollectionStore(repository: repository)
        await restarted.load()
        await restarted.waitForPreparedHistory()
        #expect(restarted.preparedHistory.portfolios[.all]?[.month]?.points.map(\.value) == store.preparedHistory.portfolios[.all]?[.month]?.points.map(\.value))
        #expect(restarted.preparedHistory.snapshots[joker.id]?[.all]?[.month]?.timesSold == store.preparedHistory.snapshots[joker.id]?[.all]?[.month]?.timesSold)
        try await store.clear()
        await store.waitForPreparedHistory()
        #expect(store.preparedHistory.items.isEmpty)
    }

    @Test func dateBoundaryRefreshesWithoutNetworkAndInvalidDatesAreRejected() async throws {
        let store = CollectionStore(repository: CollectionRepository(fileURL: URL.temporaryDirectory.appending(path: UUID().uuidString)))
        var item = CollectionItem(setNumber: "1", itemType: .set, name: "Fixture", theme: "LEGO")
        item.marketSales = CollectionHistoryDemo.joker
        try await store.add(item, isPro: true)
        store.prepareHistoryIfNeeded(force: true, now: CollectionHistoryDemo.referenceDate)
        await store.waitForPreparedHistory()
        let before = store.preparedHistory.items[item.id]?[.all]?[.month]?.first?.timestamp
        store.prepareHistoryIfNeeded(now: CollectionHistoryDemo.referenceDate.addingTimeInterval(86400))
        await store.waitForPreparedHistory()
        #expect(store.preparedHistory.items[item.id]?[.all]?[.month]?.first?.timestamp != before)
        #expect(CollectionMarketSale(date: "bad", priceUSD: 1, quantity: 1).timestamp == nil)
        #expect(CollectionMarketSale(date: "2026-09-01T01:02:03.123Z", priceUSD: 1, quantity: 1).timestamp != nil)
        #expect(CollectionMarketSale(date: "2026-09-01T01:02:03Z", priceUSD: 1, quantity: 1).timestamp != nil)
    }

    @Test func overlappingDetailAndCollectionRequestsShareFetchedRows() async throws {
        let store = CollectionStore(repository: CollectionRepository(fileURL: URL.temporaryDirectory.appending(path: UUID().uuidString)))
        let items = (0..<25).map { CollectionItem(setNumber: String($0), itemType: .set, name: "Fixture", theme: "LEGO") }
        try await store.add(items, isPro: true)
        let requests = HistoryRequests()
        var api = BrickValAPIClient.live()
        api.collectionHistory = { items in
            await requests.append(items)
            try await Task.sleep(for: .milliseconds(20))
            return CollectionHistoryDemo.response(items)
        }
        let client = api
        let detail = Task { await store.refreshMarketHistory(using: client, only: CollectionHistoryRequestItem(items[0])) }
        while !store.isRefreshingHistory { await Task.yield() }
        let collection = Task { await store.refreshMarketHistory(using: client) }
        await detail.value
        await collection.value
        let batches = await requests.batches
        #expect(batches.first?.count == 1)
        #expect(batches.allSatisfy { $0.count <= 20 })
        #expect(batches.flatMap { $0 }.count == 25)
        #expect(Set(batches.flatMap { $0 }).count == 25)
        let count = batches.count
        for _ in 0..<20 {
            for horizon in PortfolioHorizon.allCases { _ = store.preparedHistory.portfolios[.all]?[horizon] }
        }
        await store.refreshMarketHistory(using: client, only: CollectionHistoryRequestItem(items[0]))
        #expect(await requests.batches.count == count)
    }
}

private actor HistoryRequests {
    var batches: [[CollectionHistoryRequestItem]] = []
    func append(_ items: [CollectionHistoryRequestItem]) { batches.append(items) }
}
