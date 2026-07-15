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
        guard isPro || totalQuantity + item.quantity <= freeLimit else {
            throw CollectionStoreError.freeLimitReached
        }

        if let index = items.firstIndex(where: { $0.id == item.id }) {
            var updated = item
            updated.quantity += items[index].quantity
            items.remove(at: index)
            items.insert(updated, at: 0)
        } else {
            items.insert(item, at: 0)
        }
        try await persistOrReload()
    }

    func remove(_ item: CollectionItem) async throws {
        items.removeAll { $0.id == item.id }
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
