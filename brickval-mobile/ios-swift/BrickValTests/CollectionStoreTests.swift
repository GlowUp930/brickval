import Foundation
import Testing
@testable import BrickVal

@MainActor
struct CollectionStoreTests {
    @Test func upsertsMatchingSlotsAndRespectsFreeLimit() async throws {
        let repository = CollectionRepository(fileURL: temporaryURL())
        let store = CollectionStore(repository: repository)
        let item = fixture(quantity: 2)
        try await store.add(item, isPro: false)
        try await store.add(item, isPro: false)
        #expect(store.items.count == 1)
        #expect(store.items.first?.quantity == 4)
        #expect(store.totalValue == 40)

        await #expect(throws: CollectionStoreError.self) {
            try await store.add(fixture(quantity: 7, number: "2"), isPro: false)
        }
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

    private func fixture(quantity: Int, number: String = "1") -> CollectionItem {
        CollectionItem(
            setNumber: number,
            itemType: .set,
            name: "Test Set",
            theme: "Test",
            marketValueUSD: 10,
            quantity: quantity
        )
    }

    private func temporaryURL() -> URL {
        URL.temporaryDirectory.appending(path: UUID().uuidString).appending(path: "collection.json")
    }
}
