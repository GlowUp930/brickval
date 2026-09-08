import Foundation
import Observation

@Observable
@MainActor
final class CollectionStore {
    private(set) var items: [CollectionItem] = []
    private(set) var isLoading = false
    private var hasLoaded = false
    private var isSaving = false
    var errorMessage: String?

    @ObservationIgnored private let repository: CollectionRepository
    @ObservationIgnored private let defaults: UserDefaults
    private let deletionKey = "collection.accountDeletionCleanupPending"

    init(repository: CollectionRepository = CollectionRepository(), defaults: UserDefaults = .standard) {
        self.repository = repository
        self.defaults = defaults
    }

    var totalValue: Double { items.reduce(0) { $0 + $1.totalValue } }
    var totalQuantity: Int { items.reduce(0) { $0 + $1.quantity } }
    var uniqueItemCount: Int { Set(items.map(\.collectionIdentity)).count }

    func load() async {
        guard !isLoading, !isSaving else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            if defaults.bool(forKey: deletionKey) {
                try await repository.removeAll()
                defaults.removeObject(forKey: deletionKey)
            }
            items = try await repository.load()
            hasLoaded = true
            errorMessage = nil
        } catch {
            hasLoaded = false
            errorMessage = BrickValLocalization.localized("Your collection could not be loaded. Please try again.")
        }
    }

    func add(_ item: CollectionItem, isPro: Bool, freeLimit: Int = 10) async throws {
        try await add([item], isPro: isPro, freeLimit: freeLimit)
    }

    func add(_ newItems: [CollectionItem], isPro: Bool, freeLimit: Int = 10) async throws {
        try await ensureReadyToWrite()
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
        try await persist(updatedItems)
    }

    func remove(_ item: CollectionItem) async throws {
        try await ensureReadyToWrite()
        try await persist(items.filter { $0.id != item.id })
    }

    func setQuantity(_ quantity: Int, for item: CollectionItem, isPro: Bool, freeLimit: Int = 10) async throws {
        try await ensureReadyToWrite()
        let normalizedQuantity = max(0, quantity)
        guard let index = items.firstIndex(where: { $0.id == item.id }) else {
            if normalizedQuantity > 0 {
                var newItem = item
                newItem.quantity = normalizedQuantity
                try await add(newItem, isPro: isPro, freeLimit: freeLimit)
            }
            return
        }

        var updatedItems = items
        if normalizedQuantity == 0 {
            updatedItems.remove(at: index)
        } else {
            updatedItems[index].quantity = normalizedQuantity
        }
        try await persist(updatedItems)
    }

    func clearForAccountDeletion() async throws {
        defaults.set(true, forKey: deletionKey)
        do {
            try await clear()
        } catch {
            items = []
            hasLoaded = false
            errorMessage = BrickValLocalization.localized("Your collection could not be loaded. Please try again.")
            throw error
        }
    }

    func clear() async throws {
        guard !isLoading, !isSaving else { throw CocoaError(.fileWriteUnknown) }
        isSaving = true
        defer { isSaving = false }
        try await repository.removeAll()
        defaults.removeObject(forKey: deletionKey)
        items = []
        hasLoaded = true
        errorMessage = nil
    }

    func replaceForMigration(_ migrated: [CollectionItem]) async throws {
        try await ensureReadyToWrite()
        guard items.isEmpty, try await repository.isEmpty() else { return }
        try await persist(migrated)
    }

    private func ensureReadyToWrite() async throws {
        if !hasLoaded && !isLoading { await load() }
        guard hasLoaded, !isLoading, !isSaving else {
            throw NSError(domain: "BrickVal.Collection", code: 1, userInfo: [
                NSLocalizedDescriptionKey: BrickValLocalization.localized("Your collection could not be loaded. Please try again.")
            ])
        }
    }

    private func persist(_ updatedItems: [CollectionItem]) async throws {
        isSaving = true
        defer { isSaving = false }
        do {
            try await repository.replace(with: updatedItems)
            items = updatedItems
            errorMessage = nil
        } catch {
            errorMessage = BrickValLocalization.localized("That change could not be saved.")
            throw error
        }
    }
}

private extension CollectionItem {
    var collectionIdentity: String {
        "\(itemType.rawValue)-\(setNumber.lowercased())-\(colorID.map(String.init) ?? "none")"
    }
}
