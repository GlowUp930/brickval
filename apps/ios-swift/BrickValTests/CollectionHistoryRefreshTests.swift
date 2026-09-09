import Foundation
import Testing
@testable import BrickVal

@MainActor
struct CollectionHistoryRefreshTests {
    @Test func unownedUsedHistorySurvivesRestartWithoutAddingHoldings() async throws {
        let repository = CollectionRepository(fileURL: URL.temporaryDirectory.appending(path: UUID().uuidString))
        let store = CollectionStore(repository: repository)
        let item = CollectionItem(setNumber: "75192-1", itemType: .set, name: "Falcon", theme: "Star Wars", marketValueUSD: 682.58)
        try await store.add(item, isPro: true)
        var api = BrickValAPIClient.live()
        api.collectionHistory = { _ in
            CollectionHistoryResponse(items: [.init(identifier: "75192", itemType: .set, colorID: nil,
                newSales: CollectionHistoryDemo.rocket, usedSales: CollectionHistoryDemo.joker,
                fetchedAt: ISO8601DateFormatter().string(from: .now), newError: nil, usedError: nil)])
        }
        await store.refreshMarketHistory(using: api)
        let reopened = CollectionStore(repository: repository)
        await reopened.load()
        let saved = try #require(reopened.items.first)
        let used = DetailConditionOption.used.collectionItem(from: saved)
        #expect(used.marketSales == CollectionHistoryDemo.joker)
        let prepared = PortfolioHistoryBuilder.prepare(items: reopened.items, now: CollectionHistoryDemo.referenceDate)
        #expect((prepared.items[used.id]?[.month]?.count ?? 0) > 1)
        #expect(reopened.items.count == 1 && reopened.totalQuantity == 1)
    }

    @Test func existingCollectionLoadsHistoryWithoutRescanningAndSurvivesRestart() async throws {
        let repository = CollectionRepository(fileURL: URL.temporaryDirectory.appending(path: "history-test-\(UUID().uuidString).json"))
        let original = CollectionItem(setNumber: "21367-1", itemType: .set, name: "Rocket", theme: "Ideas", marketValueUSD: 150, quantity: 3)
        let store = CollectionStore(repository: repository)
        try await store.add(original, isPro: true)
        var api = BrickValAPIClient.live()
        api.collectionHistory = { CollectionHistoryDemo.response($0) }
        await store.refreshMarketHistory(using: api)
        #expect(store.items[0].marketSales.count == 22)
        #expect(store.items[0].quantity == 3 && store.items[0].id == original.id)
        #expect(PortfolioHistoryBuilder.build(items: store.items, horizon: .month).count > 2)
        let restarted = CollectionStore(repository: repository)
        await restarted.load()
        #expect(restarted.items[0].marketSales == store.items[0].marketSales)
        api.collectionHistory = { _ in throw URLError(.notConnectedToInternet) }
        await restarted.refreshMarketHistory(using: api)
        #expect(restarted.historyErrorMessage == nil) // Fresh data needs no request.
        await restarted.refreshMarketHistory(using: api, force: true)
        #expect(restarted.historyErrorMessage != nil)
        #expect(restarted.items[0].marketSales.count == 22)
    }

    @Test func conditionFailureRetainsOldHistoryAndSuccessUsesCorrectCondition() async throws {
        let store = CollectionStore(repository: CollectionRepository(fileURL: URL.temporaryDirectory.appending(path: UUID().uuidString)))
        var new = CollectionItem(setNumber: "21367", itemType: .set, name: "Rocket", theme: "Ideas")
        new.marketSales = CollectionHistoryDemo.rocket
        let used = CollectionItem(setNumber: "21367", itemType: .set, name: "Rocket", theme: "Ideas", condition: .used)
        try await store.add([new, used], isPro: true)
        var api = BrickValAPIClient.live()
        api.collectionHistory = { _ in
            CollectionHistoryResponse(items: [.init(identifier: "21367", itemType: .set, colorID: nil,
                newSales: [], usedSales: CollectionHistoryDemo.joker, fetchedAt: ISO8601DateFormatter().string(from: .now),
                newError: "upstream_unavailable", usedError: nil)])
        }
        await store.refreshMarketHistory(using: api)
        #expect(store.items.first { $0.condition == .newSealed }?.marketSales == CollectionHistoryDemo.rocket)
        #expect(store.items.first { $0.condition == .used }?.marketSales == CollectionHistoryDemo.joker)
        #expect(store.historyErrorMessage != nil)
    }

    @Test func removalAndReadditionDuringFetchCannotReceiveOldResponse() async throws {
        let store = CollectionStore(repository: CollectionRepository(fileURL: URL.temporaryDirectory.appending(path: UUID().uuidString)))
        let item = CollectionItem(setNumber: "21367", itemType: .set, name: "Rocket", theme: "Ideas")
        try await store.add(item, isPro: true)
        let (stream, continuation) = AsyncStream<Void>.makeStream()
        var api = BrickValAPIClient.live()
        api.collectionHistory = { items in
            for await _ in stream { break }
            return CollectionHistoryDemo.response(items)
        }
        let task = Task { await store.refreshMarketHistory(using: api) }
        while !store.isRefreshingHistory { await Task.yield() }
        try await store.remove(item)
        try await store.add(item, isPro: true)
        continuation.yield(())
        continuation.finish()
        await task.value
        #expect(store.items[0].marketSales.isEmpty)
    }
}
