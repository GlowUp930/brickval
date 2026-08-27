import Foundation
import PostHog

enum PostHogEvent {
    static let onboardingStarted = "onboarding_started"
    static let onboardingCompleted = "onboarding_completed"
    static let signInCompleted = "sign_in_completed"
    static let scanStarted = "scan_started"
    static let scanCompleted = "scan_completed"
    static let scanFailed = "scan_failed"
    static let scanBlocked = "scan_blocked"
    static let manualLookupStarted = "manual_lookup_started"
    static let manualLookupCompleted = "manual_lookup_completed"
    static let upgradeRequested = "upgrade_requested"
    static let itemAddedToCollection = "item_added_to_collection"
    static let itemsAddedToCollection = "items_added_to_collection"
    static let referralOpened = "referral_opened"
    static let referralInviteShared = "referral_invite_shared"
    static let referralClaimAttempted = "referral_claim_attempted"
    static let referralClaimed = "referral_claimed"
    static let referralRewardGranted = "referral_reward_granted"
    static let referralOnboardingCompleted = "referral_onboarding_completed"
    static let bulkPreviewStarted = "bulk_preview_started"
    static let bulkPreviewCompleted = "bulk_preview_completed"
    static let bulkPreviewSubscribeTapped = "bulk_preview_subscribe_tapped"
    static let bulkPreviewReferralTapped = "bulk_preview_referral_tapped"
    static let bulkPreviewRescanRequired = "bulk_preview_rescan_required"
}

@MainActor
final class PostHogAnalytics {
    static let host = "https://us.i.posthog.com"

    private(set) var isConfigured = false
    private var identifiedUserID: String?

    init(apiKey: String?) {
        guard let apiKey, apiKey.hasPrefix("phc_") else { return }

        let config = PostHogConfig(projectToken: apiKey, host: Self.host)
        config.captureScreenViews = true
        config.captureApplicationLifecycleEvents = true
        config.personProfiles = .identifiedOnly
        PostHogSDK.shared.setup(config)
        isConfigured = true
    }

    func identify(userID: String, isPro: Bool) {
        guard isConfigured else { return }
        guard identifiedUserID != userID else { return }
        identifiedUserID = userID
        PostHogSDK.shared.identify(
            userID,
            userProperties: ["plan": isPro ? "pro" : "free"]
        )
        PostHogSDK.shared.reloadFeatureFlags()
    }

    func updatePlan(isPro: Bool) {
        guard isConfigured, let identifiedUserID else { return }
        PostHogSDK.shared.identify(
            identifiedUserID,
            userProperties: ["plan": isPro ? "pro" : "free"]
        )
    }

    func reset() {
        guard isConfigured else { return }
        identifiedUserID = nil
        PostHogSDK.shared.reset()
    }

    func capture(_ event: String, properties: [String: Any] = [:]) {
        guard isConfigured else { return }
        PostHogSDK.shared.capture(event, properties: properties)
    }

    func isFeatureEnabled(_ key: String) -> Bool {
        guard isConfigured else { return false }
        return PostHogSDK.shared.isFeatureEnabled(key)
    }

    func reloadFeatureFlags() {
        guard isConfigured else { return }
        PostHogSDK.shared.reloadFeatureFlags()
    }
}
