import Foundation

struct LegacyPreferenceValues: Sendable {
    var hasCompletedOnboarding: Bool?
    var primaryGoal: PrimaryGoal?
    var smartAutoScanEnabled: Bool?
    var scanImprovementConsent: Bool?
    var theme: ThemePreference?
    var accent: AccentPreference?
    var avatarName: String?
    var hasSeenHistoryTip: Bool?
    var guestScansUsed: Int?
}
