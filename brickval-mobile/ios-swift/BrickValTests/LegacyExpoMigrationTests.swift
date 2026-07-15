import Foundation
import Testing
@testable import BrickVal

@MainActor
struct LegacyExpoMigrationTests {
    @Test func migratesCollectionAndPreferencesOnce() async throws {
        let suite = "LegacyExpoMigrationTests-\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defaults.removePersistentDomain(forName: suite)
        let item = CollectionItem(setNumber: "75379", itemType: .set, name: "R2-D2", theme: "Star Wars", marketValueUSD: 90)
        let collectionJSON = String(decoding: try JSONEncoder().encode([item]), as: UTF8.self)
        let values = [
            "brickval_collection": collectionJSON,
            "has_completed_onboarding": "true",
            "brickval_theme_preference": "light",
            "brickval_accent_preference": "blue",
            "guest_scan_lookups_used": "3",
        ]
        let repository = CollectionRepository(
            fileURL: URL.temporaryDirectory.appending(path: UUID().uuidString).appending(path: "collection.json")
        )
        let collection = CollectionStore(repository: repository)
        let preferences = PreferencesStore(defaults: defaults)
        let migration = LegacyExpoMigration(readLegacyValue: { values[$0] }, defaults: defaults)

        let result = try await migration.run(collectionStore: collection, preferences: preferences)
        #expect(result == .migrated(itemCount: 1))
        #expect(collection.items.first?.setNumber == "75379")
        #expect(preferences.hasCompletedOnboarding)
        #expect(preferences.theme == .light)
        #expect(preferences.accent == .blue)
        #expect(preferences.guestScansUsed == 3)
        #expect(try await migration.run(collectionStore: collection, preferences: preferences) == .alreadyCompleted)
    }
}
