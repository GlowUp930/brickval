import Foundation
import Testing
@testable import BrickVal

@MainActor
struct CollectionStoreTests {
    @Test func legacyFalconRecoversBothQuotesWithoutChangingOwnership() async throws {
        let repository = CollectionRepository(fileURL: temporaryURL())
        let store = CollectionStore(repository: repository)
        let item = CollectionItem(setNumber: "75192-1", itemType: .set, name: "Falcon", theme: "Star Wars", marketValueUSD: 682.58, quantity: 2)
        try await store.add(item, isPro: true)
        var api = BrickValAPIClient.live()
        api.lookup = { _, _, _ in
            let pricing = try JSONDecoder().decode(LookupPricing.self, from: Data(#"{"hero_new_avg_usd":682.58,"hero_used_avg_usd":520.82,"used_data_source":"sold"}"#.utf8))
            return LookupResult(identifier: "75192-1", itemType: .set, name: "Falcon", theme: "Star Wars", pieces: nil, yearReleased: nil, isObsolete: nil, imageURL: nil, pricing: pricing, marketHistory: [], colorID: nil, colorName: nil)
        }
        try await store.recoverPricing(for: item, using: api)
        let reopened = CollectionStore(repository: repository)
        await reopened.load()
        let saved = try #require(reopened.items.first)
        #expect(DetailConditionOption.used.value(from: saved) == 520.82)
        #expect(saved.quantity == 2 && saved.id == item.id)
        #expect(reopened.totalValue == 1365.16)
        api.lookup = { _, _, _ in throw URLError(.notConnectedToInternet) }
        try await reopened.recoverPricing(for: saved, using: api)
    }

    @Test func falconUsedPriceSurvivesReopeningNewHolding() async throws {
        let pricing = try JSONDecoder().decode(LookupPricing.self, from: Data(#"{"hero_new_avg_usd":682.58,"hero_used_avg_usd":520.82,"new_data_source":"sold","used_data_source":"sold"}"#.utf8))
        let result = LookupResult(identifier: "75192-1", itemType: .set, name: "Millennium Falcon", theme: "Star Wars", pieces: nil, yearReleased: 2017, isObsolete: nil, imageURL: nil, pricing: pricing, marketHistory: [], colorID: nil, colorName: nil)
        let repository = CollectionRepository(fileURL: temporaryURL())
        let store = CollectionStore(repository: repository)
        try await store.add(result.collectionItem(quantity: 1, condition: .newSealed), isPro: true)
        let reopened = CollectionStore(repository: repository)
        await reopened.load()
        let saved = try #require(reopened.items.first)
        #expect(DetailConditionOption.used.value(from: saved) == 520.82)
        #expect(DetailConditionOption.used.collectionItem(from: saved).marketValueUSD == 520.82)
        #expect(reopened.items.count == 1)
        #expect(saved.condition == .newSealed)
    }

    @Test func rescanningRetainsRecordedPricesAfterRestart() async throws {
        let repository = CollectionRepository(fileURL: temporaryURL())
        let store = CollectionStore(repository: repository)
        let first = CollectionItem(setNumber: "test", itemType: .minifig, name: "Test", theme: "LEGO",
                                   marketValueUSD: 10, condition: .used, addedAt: "2026-09-01T00:00:00Z")
        let second = CollectionItem(setNumber: "test", itemType: .minifig, name: "Test", theme: "LEGO",
                                    marketValueUSD: 15, condition: .used, addedAt: "2026-09-08T00:00:00Z")
        try await store.add(first, isPro: true)
        try await store.add(second, isPro: true)
        let restarted = CollectionStore(repository: repository)
        await restarted.load()
        #expect(restarted.items.first?.marketHistory.map(\.priceUSD) == [10, 15])
        #expect(restarted.items.first?.quantity == 2)
    }

    @Test func accountDeletionCleanupResumesAfterRestart() async throws {
        let suite = "deletion-" + UUID().uuidString
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let repository = CollectionRepository(fileURL: temporaryURL())
        let initial = CollectionStore(repository: repository, defaults: defaults)
        try await initial.add(fixture(quantity: 1), isPro: true)
        defaults.set(true, forKey: "collection.accountDeletionCleanupPending")
        let restarted = CollectionStore(repository: repository, defaults: defaults)
        await restarted.load()
        #expect(restarted.items.isEmpty)
        #expect(!defaults.bool(forKey: "collection.accountDeletionCleanupPending"))
        #expect(try await repository.load().isEmpty)
    }

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
        var item = CollectionItem(
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
        item.marketSales = item.marketHistory.map {
            CollectionMarketSale(date: $0.date + "T00:00:00Z", priceUSD: $0.priceUSD, quantity: 1)
        }

        let points = PortfolioHistoryBuilder.build(items: [item], horizon: .month)
        let values = points.map(\.value)

        #expect(values.count > 1)
        #expect(Set(values).count > 1)
        #expect(values.last == 240)
    }

    @Test func portfolioHistoryDoesNotInventMovementWithoutObservations() {
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

        #expect(values.isEmpty)
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

    @Test func failedLoadNeverOverwritesOriginal() async throws {
        let url = temporaryURL()
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        let original = Data("{broken but recoverable".utf8)
        try original.write(to: url)
        let store = CollectionStore(repository: CollectionRepository(fileURL: url))
        await store.load()
        await #expect(throws: (any Error).self) { try await store.add(fixture(quantity: 1), isPro: true) }
        #expect(try Data(contentsOf: url) == original)
        #expect(store.items.isEmpty)
    }

    @Test func unreadableCollectionRecoversBackupAndPreservesOriginal() async throws {
        let url = temporaryURL()
        defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        let repository = CollectionRepository(fileURL: url)
        try await repository.replace(with: [fixture(quantity: 1)])
        try await repository.replace(with: [fixture(quantity: 2)])
        let corrupt = Data("broken".utf8)
        try corrupt.write(to: url)
        let store = CollectionStore(repository: repository)
        await store.load()
        #expect(store.totalQuantity == 1)
        try await store.add(fixture(quantity: 1), isPro: true)
        #expect(store.totalQuantity == 2)
        let files = try FileManager.default.contentsOfDirectory(at: url.deletingLastPathComponent(), includingPropertiesForKeys: nil)
        let preserved = try #require(files.first { $0.lastPathComponent.contains("unreadable-") })
        #expect(try Data(contentsOf: preserved) == corrupt)
    }

    @Test func explicitDeletionRemovesRecoveryCopies() async throws {
        let url = temporaryURL()
        defer { try? FileManager.default.removeItem(at: url.deletingLastPathComponent()) }
        let repository = CollectionRepository(fileURL: url)
        try await repository.replace(with: [fixture(quantity: 1)])
        try await repository.replace(with: [fixture(quantity: 2)])
        try Data("corrupt".utf8).write(to: url)
        let store = CollectionStore(repository: repository)
        await store.load()
        try await store.clear()
        let files = try FileManager.default.contentsOfDirectory(at: url.deletingLastPathComponent(), includingPropertiesForKeys: nil)
        #expect(files.isEmpty)
        #expect(store.items.isEmpty)
    }

    @Test func pricingKeepsConditionsAndFallbackSourcesSeparate() throws {
        let data = Data(#"{"ebay_new_avg_usd":100,"ebay_used_avg_usd":80,"new_data_source":"listing","used_data_source":"sold"}"#.utf8)
        let price = try JSONDecoder().decode(LookupPricing.self, from: data)
        #expect(price.preferredNewValue == 100)
        #expect(price.preferredUsedValue == 80)
        #expect(price.source(for: .used) == "sold")
        let newOnly = try JSONDecoder().decode(LookupPricing.self, from: Data(#"{"hero_new_avg_usd":100}"#.utf8))
        #expect(newOnly.preferredUsedValue == nil)
    }

    @Test func pendingInviteSurvivesRestartAndClear() {
        let suite = "referral-test-\(UUID())"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        AppRouter(defaults: defaults).handle(url: URL(string: "https://brickvalue.live/r/ABCD2345")!)
        let restarted = AppRouter(defaults: defaults)
        #expect(restarted.pendingReferralCode == "ABCD2345")
        restarted.clearPendingReferral()
        #expect(AppRouter(defaults: defaults).pendingReferralCode == nil)
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
