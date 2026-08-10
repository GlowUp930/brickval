import Foundation
import Testing
@testable import BrickVal

@MainActor
struct CollectionStoreTests {
    @Test func upsertsMatchingSlotsWithoutConsumingAnotherUniqueSlot() async throws {
        let repository = CollectionRepository(fileURL: temporaryURL())
        let store = CollectionStore(repository: repository)
        let item = fixture(quantity: 2)
        try await store.add(item, isPro: false)
        try await store.add(item, isPro: false)
        #expect(store.items.count == 1)
        #expect(store.items.first?.quantity == 4)
        #expect(store.totalValue == 40)
        #expect(store.uniqueItemCount == 1)
    }

    @Test func persistsAndReloadsCollection() async throws {
        let url = temporaryURL()
        let repository = CollectionRepository(fileURL: url)
        let first = CollectionStore(repository: repository)
        try await first.add(fixture(quantity: 3), isPro: true)

        let second = CollectionStore(repository: repository)
        await second.load()
        #expect(second.items.first?.quantity == 3)
        #expect(second.totalValue == 30)
    }

    @Test func bulkAddAggregatesDuplicatesAndPersistsOnce() async throws {
        let url = temporaryURL()
        let store = CollectionStore(repository: CollectionRepository(fileURL: url))

        try await store.add([
            fixture(quantity: 1, number: "fig-1", condition: .used),
            fixture(quantity: 1, number: "fig-1", condition: .used),
            fixture(quantity: 1, number: "fig-2", condition: .newSealed),
        ], isPro: true)

        #expect(store.items.count == 2)
        #expect(store.items.first { $0.setNumber == "fig-1" }?.quantity == 2)
        #expect(store.totalQuantity == 3)

        let reloaded = CollectionStore(repository: CollectionRepository(fileURL: url))
        await reloaded.load()
        #expect(reloaded.totalQuantity == 3)
    }

    @Test func rejectedBulkAddDoesNotPartiallyChangeCollection() async throws {
        let store = CollectionStore(repository: CollectionRepository(fileURL: temporaryURL()))
        for index in 0..<10 {
            try await store.add(fixture(quantity: 1, number: "\(index)"), isPro: false)
        }

        await #expect(throws: CollectionStoreError.self) {
            try await store.add([
                fixture(quantity: 2, number: "0"),
                fixture(quantity: 1, number: "11"),
            ], isPro: false)
        }

        #expect(store.uniqueItemCount == 10)
        #expect(store.items.first { $0.setNumber == "0" }?.quantity == 1)
        #expect(store.items.contains { $0.setNumber == "11" } == false)
    }

    @Test func freeCollectionAllowsTenUniqueItemsAndRejectsTheEleventh() async throws {
        let store = CollectionStore(repository: CollectionRepository(fileURL: temporaryURL()))
        for index in 0..<10 {
            try await store.add(fixture(quantity: 1, number: "\(index)"), isPro: false)
        }

        #expect(store.uniqueItemCount == 10)
        await #expect(throws: CollectionStoreError.self) {
            try await store.add(fixture(quantity: 1, number: "10"), isPro: false)
        }
    }

    @Test func conditionsForTheSameProductUseOneUniqueSlot() async throws {
        let store = CollectionStore(repository: CollectionRepository(fileURL: temporaryURL()))
        try await store.add(fixture(quantity: 1, number: "same", condition: .newSealed), isPro: false)
        try await store.add(fixture(quantity: 2, number: "same", condition: .used), isPro: false)

        #expect(store.items.count == 2)
        #expect(store.uniqueItemCount == 1)
        #expect(store.totalQuantity == 3)
    }

    @Test func existingOverLimitCollectionCanChangeQuantityButCannotAddUniqueItem() async throws {
        let store = CollectionStore(repository: CollectionRepository(fileURL: temporaryURL()))
        for index in 0..<11 {
            try await store.add(fixture(quantity: 1, number: "\(index)"), isPro: true)
        }
        let existing = try #require(store.items.first { $0.setNumber == "0" })

        try await store.setQuantity(4, for: existing, isPro: false)
        #expect(store.items.first { $0.setNumber == "0" }?.quantity == 4)

        await #expect(throws: CollectionStoreError.self) {
            try await store.add(fixture(quantity: 1, number: "new"), isPro: false)
        }
    }

    @Test func setQuantityUpdatesCreatesAndRemovesConditionSlots() async throws {
        let repository = CollectionRepository(fileURL: temporaryURL())
        let store = CollectionStore(repository: repository)
        let newItem = fixture(quantity: 1)
        let usedItem = fixture(quantity: 1, condition: .used)

        try await store.add(newItem, isPro: true)
        try await store.setQuantity(3, for: newItem, isPro: true)
        try await store.setQuantity(2, for: usedItem, isPro: true)

        #expect(store.items.first { $0.condition == .newSealed }?.quantity == 3)
        #expect(store.items.first { $0.condition == .used }?.quantity == 2)
        #expect(store.totalQuantity == 5)

        try await store.setQuantity(0, for: usedItem, isPro: true)

        #expect(store.items.contains { $0.condition == .used } == false)
        #expect(store.totalQuantity == 3)
    }

    @Test func collectionGridCombinesConditionSlotsForSameSet() {
        let newItem = fixture(quantity: 1, number: "77260-1", condition: .newSealed)
        let usedItem = fixture(quantity: 1, number: "77260-1", condition: .used)

        let cards = CollectionDisplayItem.make(from: [usedItem, newItem])

        #expect(cards.count == 1)
        #expect(cards.first?.setNumber == "77260-1")
        #expect(cards.first?.quantity == 2)
        #expect(cards.first?.totalValue == 20)
    }

    @Test func portfolioHistoryUsesAddedItemMarketHistory() {
        let item = CollectionItem(
            setNumber: "75379",
            itemType: .set,
            name: "R2-D2",
            theme: "Star Wars",
            marketValueUSD: 120,
            quantity: 2,
            marketHistory: [
                historyPoint(daysAgo: 28, value: 82),
                historyPoint(daysAgo: 21, value: 96),
                historyPoint(daysAgo: 14, value: 108),
                historyPoint(daysAgo: 0, value: 120),
            ]
        )

        let points = PortfolioHistoryBuilder.build(items: [item], horizon: .month)
        let values = points.map(\.value)

        #expect(values.count > 1)
        #expect(Set(values).count > 1)
        #expect(values.last == 240)
    }

    @Test func portfolioHistoryForAddedItemWithoutHistoryStillShowsMovement() {
        let item = CollectionItem(
            setNumber: "10305",
            itemType: .set,
            name: "Lion Knights' Castle",
            theme: "Icons",
            marketValueUSD: 400,
            quantity: 1,
            marketHistory: []
        )

        let points = PortfolioHistoryBuilder.build(items: [item], horizon: .month)
        let values = points.map(\.value)

        #expect(values.count > 1)
        #expect(Set(values).count > 1)
        #expect(values.last == 400)
    }

    @Test func reloadsCollectionFromDirectoryContainingSpaces() async throws {
        let url = URL.temporaryDirectory
            .appending(path: UUID().uuidString)
            .appending(path: "Application Support", directoryHint: .isDirectory)
            .appending(path: "collection.json")
        let repository = CollectionRepository(fileURL: url)
        let first = CollectionStore(repository: repository)
        try await first.add(fixture(quantity: 2), isPro: true)

        let second = CollectionStore(repository: repository)
        await second.load()

        #expect(second.items.first?.quantity == 2)
        #expect(second.errorMessage == nil)
    }

    private func fixture(quantity: Int, number: String = "1", condition: CollectionCondition = .newSealed) -> CollectionItem {
        CollectionItem(
            setNumber: number,
            itemType: .set,
            name: "Test Set",
            theme: "Test",
            marketValueUSD: 10,
            quantity: quantity,
            condition: condition
        )
    }

    private func temporaryURL() -> URL {
        URL.temporaryDirectory.appending(path: UUID().uuidString).appending(path: "collection.json")
    }

    private func historyPoint(daysAgo: Int, value: Double) -> MarketHistoryPoint {
        let date = Calendar(identifier: .gregorian).date(byAdding: .day, value: -daysAgo, to: .now) ?? .now
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return MarketHistoryPoint(date: formatter.string(from: date), priceUSD: value, source: nil)
    }
}
