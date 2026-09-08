import Foundation
import Observation

@Observable
@MainActor
final class CollectionStore {
    private(set) var items: [CollectionItem] = []
    private(set) var isLoading = false
    private var hasLoaded = false
    private var isSaving = false
    private var historyEpoch = 0
    var errorMessage: String?
    private(set) var isRefreshingHistory = false
    private(set) var historyErrorMessage: String?

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
            var updated = item
            updated.marketHistory = item.recordedHistory
            if let index = updatedItems.firstIndex(where: { $0.id == item.id }) {
                let combined = updatedItems[index].recordedHistory + updated.marketHistory
                updated.marketHistory = Dictionary(combined.map { ($0.date, $0) }, uniquingKeysWith: { _, latest in latest })
                    .values.sorted { $0.date < $1.date }
                updated.marketSales = updatedItems[index].marketSales
                updated.marketHistoryFetchedAt = updatedItems[index].marketHistoryFetchedAt
                updated.quantity += updatedItems[index].quantity
                updatedItems.remove(at: index)
                updatedItems.insert(updated, at: 0)
            } else {
                updatedItems.insert(updated, at: 0)
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
        historyEpoch += 1
    }

    func refreshMarketHistory(using api: BrickValAPIClient, force: Bool = false) async {
        guard !isRefreshingHistory else { return }
        if !hasLoaded { await load() }
        guard hasLoaded else { return }
        let pending = items.filter { item in
            guard !force, let raw = item.marketHistoryFetchedAt,
                  let date = CollectionMarketSale(date: raw, priceUSD: 1, quantity: 1).timestamp else { return true }
            return Date.now.timeIntervalSince(date) >= 86400 || date > .now
        }
        guard !pending.isEmpty else { return }
        isRefreshingHistory = true
        historyErrorMessage = nil
        defer { isRefreshingHistory = false }
        let versions = Dictionary(uniqueKeysWithValues: pending.map { ($0.id, $0.addedAt) })
        let epoch = historyEpoch
        var requested: [CollectionHistoryRequestItem] = []
        for item in pending {
            let key = CollectionHistoryRequestItem(item)
            if !requested.contains(key) { requested.append(key) }
        }
        for offset in stride(from: 0, to: requested.count, by: 20) {
            do {
                let batch = Array(requested[offset..<min(offset + 20, requested.count)])
                let response = try await api.collectionHistory(batch)
                try Task.checkCancellation()
                guard epoch == historyEpoch else { return }
                try await ensureReadyToWrite()
                var updated = items
                var changed = false
                for index in updated.indices {
                    let item = updated[index]
                    guard versions[item.id] == item.addedAt else { continue }
                    let key = CollectionHistoryRequestItem(item)
                    guard batch.contains(key) else { continue }
                    guard let row = response.items.first(where: { $0.identifier == key.identifier && $0.itemType == key.itemType && $0.colorID == key.colorID }),
                          (item.condition == .used ? row.usedError : row.newError) == nil else {
                        historyErrorMessage = BrickValLocalization.localized("Some price history could not be refreshed. Pull down to retry.")
                        continue
                    }
                    updated[index].marketSales = item.condition == .used ? row.usedSales : row.newSales
                    updated[index].marketHistoryFetchedAt = row.fetchedAt
                    changed = true
                }
                if changed { try await persist(updated) }
            } catch is CancellationError { return }
            catch {
                historyErrorMessage = BrickValLocalization.localized("Some price history could not be refreshed. Pull down to retry.")
            }
        }
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
        if normalizedQuantity == 0 { historyEpoch += 1 }
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
        historyEpoch += 1
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
