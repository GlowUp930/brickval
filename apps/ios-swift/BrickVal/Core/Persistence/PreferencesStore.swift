import Foundation
import Observation
import SwiftUI

@Observable
@MainActor
final class PreferencesStore {
    var isReplayingOnboarding = false
    var shouldReturnToOnboardingAccount = false
    var hasCompletedOnboarding: Bool { didSet { save(hasCompletedOnboarding, for: Keys.onboarding) } }
    var primaryGoal: PrimaryGoal? { didSet { save(primaryGoal?.rawValue, for: Keys.goal) } }
    var smartAutoScanEnabled: Bool { didSet { save(smartAutoScanEnabled, for: Keys.smartScan) } }
    var scanImprovementConsent: Bool { didSet { save(scanImprovementConsent, for: Keys.consent) } }
    var theme: ThemePreference { didSet { save(theme.rawValue, for: Keys.theme) } }
    var accent: AccentPreference { didSet { save(accent.rawValue, for: Keys.accent) } }
    var avatarName: String? { didSet { save(avatarName, for: Keys.avatar) } }
    var avatarBackground: AvatarBackgroundPreference { didSet { save(avatarBackground.rawValue, for: Keys.avatarBackground) } }
    var hasSeenHistoryTip: Bool { didSet { save(hasSeenHistoryTip, for: Keys.historyTip) } }
    var hasSeenCollectionTips: Bool { didSet { save(hasSeenCollectionTips, for: Keys.collectionTips) } }
    var hasSeenScanTips: Bool { didSet { save(hasSeenScanTips, for: Keys.scanTips) } }
    var guestScansUsed: Int { didSet { save(guestScansUsed, for: Keys.guestScans) } }
    var hasRequestedReview: Bool { didSet { save(hasRequestedReview, for: Keys.reviewRequested) } }
    var referralOnboardingCompletionPending: Bool { didSet { save(referralOnboardingCompletionPending, for: Keys.referralOnboardingCompletionPending) } }

    @ObservationIgnored private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        hasCompletedOnboarding = defaults.bool(forKey: Keys.onboarding)
        primaryGoal = defaults.string(forKey: Keys.goal).flatMap(PrimaryGoal.init(rawValue:))
        smartAutoScanEnabled = defaults.object(forKey: Keys.smartScan) as? Bool ?? true
        scanImprovementConsent = defaults.bool(forKey: Keys.consent)
        theme = defaults.string(forKey: Keys.theme).flatMap(ThemePreference.init(rawValue:)) ?? .dark
        accent = defaults.string(forKey: Keys.accent).flatMap(AccentPreference.init(rawValue:)) ?? .green
        avatarName = defaults.string(forKey: Keys.avatar)
        avatarBackground = defaults.string(forKey: Keys.avatarBackground).flatMap(AvatarBackgroundPreference.init(rawValue:)) ?? .accent
        hasSeenHistoryTip = defaults.bool(forKey: Keys.historyTip)
        hasSeenCollectionTips = defaults.bool(forKey: Keys.collectionTips)
        hasSeenScanTips = defaults.bool(forKey: Keys.scanTips)
        guestScansUsed = defaults.integer(forKey: Keys.guestScans)
        hasRequestedReview = defaults.bool(forKey: Keys.reviewRequested)
        referralOnboardingCompletionPending = defaults.bool(forKey: Keys.referralOnboardingCompletionPending)
    }

    func applyLegacy(_ values: LegacyPreferenceValues) {
        if let value = values.hasCompletedOnboarding { hasCompletedOnboarding = value }
        if let value = values.primaryGoal { primaryGoal = value }
        if let value = values.smartAutoScanEnabled { smartAutoScanEnabled = value }
        if let value = values.scanImprovementConsent { scanImprovementConsent = value }
        if let value = values.theme { theme = value }
        if let value = values.accent { accent = value }
        if let value = values.avatarName { avatarName = value }
        if let value = values.hasSeenHistoryTip { hasSeenHistoryTip = value }
        if let value = values.guestScansUsed { guestScansUsed = value }
    }

    private func save(_ value: Any?, for key: String) {
        if let value {
            defaults.set(value, forKey: key)
        } else {
            defaults.removeObject(forKey: key)
        }
    }

    private enum Keys {
        static let onboarding = "has_completed_onboarding"
        static let goal = "primary_goal"
        static let smartScan = "brickval_smart_auto_scan"
        static let consent = "brickval_scan_improvement_consent"
        static let theme = "brickval_theme_preference"
        static let accent = "brickval_accent_preference"
        static let avatar = "brickval_account_avatar"
        static let avatarBackground = "brickval_account_avatar_background"
        static let avatarCustomColor = "brickval_account_avatar_custom_color"
        static let historyTip = "brickval_home_history_tip_seen"
        static let collectionTips = "brickval_collection_tips_seen"
        static let scanTips = "brickval_scan_tips_seen"
        static let guestScans = "guest_scan_lookups_used"
        static let reviewRequested = "brickval_review_requested"
        static let referralOnboardingCompletionPending = "brickvalue_referral_onboarding_completion_pending"
    }

    var avatarBackgroundColor: Color {
        get {
            if avatarBackground == .accent {
                return accent.color
            }
            if avatarBackground == .custom,
               let data = defaults.data(forKey: Keys.avatarCustomColor),
               let stored = try? JSONDecoder().decode(StoredAvatarColor.self, from: data) {
                return stored.color
            }
            return avatarBackground.color
        }
        set {
            avatarBackground = .custom
            if let data = try? JSONEncoder().encode(StoredAvatarColor(color: newValue)) {
                defaults.set(data, forKey: Keys.avatarCustomColor)
            }
        }
    }
}
