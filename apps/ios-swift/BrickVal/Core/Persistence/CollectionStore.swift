import Foundation
import Observation

@Observable
@MainActor
final class CollectionStore {
    private(set) var items: [CollectionItem] = []
    private(set) var isLoading = false
    var errorMessage: String?

    @ObservationIgnored private let repository: CollectionRepository

    init(repository: CollectionRepository = CollectionRepository()) {
        self.repository = repository
    }

    var totalValue: Double { items.reduce(0) { $0 + $1.totalValue } }
    var totalQuantity: Int { items.reduce(0) { $0 + $1.quantity } }
    var uniqueItemCount: Int { Set(items.map(\.collectionIdentity)).count }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            items = try await repository.load()
            errorMessage = nil
        } catch {
            errorMessage = "Your collection could not be loaded. Please try again."
        }
    }

    func add(_ item: CollectionItem, isPro: Bool, freeLimit: Int = 10) async throws {
        try await add([item], isPro: isPro, freeLimit: freeLimit)
    }

    func add(_ newItems: [CollectionItem], isPro: Bool, freeLimit: Int = 10) async throws {
        guard !newItems.isEmpty else { return }
        var updatedItems = items
        for item in newItems {
            if let index = updatedItems.firstIndex(where: { $0.id == item.id }) {
                var updated = item
                updated.quantity += updatedItems[index].quantity
                updatedItems.remove(at: index)
                updatedItems.insert(updated, at: 0)
            } else {
                updatedItems.insert(item, at: 0)
            }
        }
        let updatedUniqueCount = Set(updatedItems.map(\.collectionIdentity)).count
        guard isPro || updatedUniqueCount <= freeLimit else {
            throw CollectionStoreError.freeLimitReached(limit: freeLimit, used: uniqueItemCount)
        }
        items = updatedItems
        try await persistOrReload()
    }

    func remove(_ item: CollectionItem) async throws {
        items.removeAll { $0.id == item.id }
        try await persistOrReload()
    }

    func setQuantity(_ quantity: Int, for item: CollectionItem, isPro: Bool, freeLimit: Int = 10) async throws {
        let normalizedQuantity = max(0, quantity)
        guard let index = items.firstIndex(where: { $0.id == item.id }) else {
            if normalizedQuantity > 0 {
                var newItem = item
                newItem.quantity = normalizedQuantity
                try await add(newItem, isPro: isPro, freeLimit: freeLimit)
            }
            return
        }

        if normalizedQuantity == 0 {
            items.remove(at: index)
        } else {
            items[index].quantity = normalizedQuantity
        }
        try await persistOrReload()
    }

    func clear() async throws {
        items = []
        try await persistOrReload()
    }

    func replaceForMigration(_ migrated: [CollectionItem]) async throws {
        guard items.isEmpty, try await repository.isEmpty() else { return }
        items = migrated
        try await persistOrReload()
    }

    private func persistOrReload() async throws {
        do {
            try await repository.replace(with: items)
            errorMessage = nil
        } catch {
            items = (try? await repository.load()) ?? []
            errorMessage = "That change could not be saved."
            throw error
        }
    }
}

private extension CollectionItem {
    var collectionIdentity: String {
        "\(itemType.rawValue)-\(setNumber.lowercased())-\(colorID.map(String.init) ?? "none")"
    }
}
