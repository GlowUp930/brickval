import Foundation

actor LegacyExpoMigration {
    private let readLegacyValue: @Sendable (String) -> String?
    private let defaults: UserDefaults
    private let decoder = JSONDecoder()
    private let migrationVersion = 1

    init(
        readLegacyValue: @escaping @Sendable (String) -> String? = { LegacyKeychainReader().string(for: $0) },
        defaults: UserDefaults = .standard
    ) {
        self.readLegacyValue = readLegacyValue
        self.defaults = defaults
    }

    func run(collectionStore: CollectionStore, preferences: PreferencesStore) async throws -> LegacyMigrationResult {
        guard defaults.integer(forKey: "legacy_expo_migration_version") < migrationVersion else {
            return .alreadyCompleted
        }

        var itemCount = 0
        if let rawCollection = readLegacyValue("brickval_collection") {
            let items = try decoder.decode([CollectionItem].self, from: Data(rawCollection.utf8))
            try await collectionStore.replaceForMigration(items)
            itemCount = items.count
        }

        let values = LegacyPreferenceValues(
            hasCompletedOnboarding: bool("has_completed_onboarding", trueValue: "true"),
            primaryGoal: readLegacyValue("primary_goal").flatMap(PrimaryGoal.init(rawValue:)),
            smartAutoScanEnabled: bool("brickval_smart_auto_scan", trueValue: "1"),
            scanImprovementConsent: bool("brickval_scan_improvement_consent", trueValue: "1"),
            theme: readLegacyValue("brickval_theme_preference").flatMap(ThemePreference.init(rawValue:)),
            accent: readLegacyValue("brickval_accent_preference").flatMap(AccentPreference.init(rawValue:)),
            avatarName: readLegacyValue("brickval_account_avatar"),
            hasSeenHistoryTip: bool("brickval_home_history_tip_seen", trueValue: "1"),
            guestScansUsed: readLegacyValue("guest_scan_lookups_used").flatMap(Int.init)
        )
        await preferences.applyLegacy(values)
        defaults.set(migrationVersion, forKey: "legacy_expo_migration_version")
        return .migrated(itemCount: itemCount)
    }

    private func bool(_ key: String, trueValue: String) -> Bool? {
        guard let value = readLegacyValue(key) else { return nil }
        return value == trueValue
    }
}
