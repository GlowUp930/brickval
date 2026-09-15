import Foundation
import PostHog

enum PostHogEvent {
    static let appReady = "app_ready"
    static let onboardingScreenShown = "onboarding_screen_shown"
    static let onboardingStarted = "onboarding_started"
    static let onboardingGetStartedTapped = "onboarding_get_started_tapped"
    static let onboardingCompleted = "onboarding_completed"
    static let trialActivationPromptShown = "trial_activation_prompt_shown"
    static let trialActivationPromptTapped = "trial_activation_prompt_tapped"
    static let signInCompleted = "sign_in_completed"
    static let scanStarted = "scan_started"
    static let scanCompleted = "scan_completed"
    static let scanFailed = "scan_failed"
    static let scanBlocked = "scan_blocked"
    static let manualLookupStarted = "manual_lookup_started"
    static let manualLookupCompleted = "manual_lookup_completed"
    static let upgradeRequested = "upgrade_requested"
    static let paywallPresented = "paywall_presented"
    static let paywallDismissed = "paywall_dismissed"
    static let paywallPresentationFailed = "paywall_presentation_failed"
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
    private static let installIDKey = "brickvalue_posthog_install_id"
    private static let identifiedUserIDKey = "brickvalue_posthog_identified_user_id"

    private(set) var isConfigured = false
    private(set) var installID: String
    private let defaults: UserDefaults
    private var identifiedUserID: String?
    private var accessCohort: String?

    init(apiKey: String?, defaults: UserDefaults = .standard) {
        self.defaults = defaults
        if let storedInstallID = defaults.string(forKey: Self.installIDKey), !storedInstallID.isEmpty {
            installID = storedInstallID
        } else {
            let newInstallID = UUID().uuidString
            installID = newInstallID
            defaults.set(newInstallID, forKey: Self.installIDKey)
        }

        guard let apiKey, apiKey.hasPrefix("phc_") else { return }

        let config = PostHogConfig(projectToken: apiKey, host: Self.host)
        config.captureScreenViews = true
        config.captureApplicationLifecycleEvents = true
        config.personProfiles = .identifiedOnly
#if os(iOS)
        // SwiftUI screens require screenshot mode for native session replay.
        // Keep the SDK's privacy-first masking defaults explicit because the
        // app displays account details, collection data, and user photos.
        config.sessionReplay = true
        config.sessionReplayConfig.screenshotMode = true
        config.sessionReplayConfig.maskAllTextInputs = true
        config.sessionReplayConfig.maskAllImages = true
        config.sessionReplayConfig.maskAllSandboxedViews = true
        config.sessionReplayConfig.captureNetworkTelemetry = true
        config.sessionReplayConfig.captureLogs = false
#endif
        PostHogSDK.shared.setup(config)
        isConfigured = true
        registerInstallContext()
    }

    func identify(userID: String, isPro: Bool) {
        guard isConfigured else { return }
        guard !userID.isEmpty else { return }
        let previousUserID = identifiedUserID ?? defaults.string(forKey: Self.identifiedUserIDKey)
        if let previousUserID, previousUserID != userID {
            reset()
        }
        guard identifiedUserID != userID else { return }
        identifiedUserID = userID
        defaults.set(userID, forKey: Self.identifiedUserIDKey)
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
        // The identity sync task also runs on a fresh signed-out launch. In
        // that case PostHog is already using the install's anonymous ID and a
        // reset would rotate it between the automatic install event and the
        // first onboarding event. Only reset an identified account session.
        guard Self.shouldResetIdentity(
            identifiedUserID: identifiedUserID ?? defaults.string(forKey: Self.identifiedUserIDKey),
            currentDistinctID: PostHogSDK.shared.getDistinctId(),
            anonymousID: PostHogSDK.shared.getAnonymousId()
        ) else { return }
        identifiedUserID = nil
        defaults.removeObject(forKey: Self.identifiedUserIDKey)
        accessCohort = nil
        PostHogSDK.shared.reset()
        registerInstallContext()
    }

    /// Adds the release and experiment context that is otherwise easy to lose
    /// when comparing App Store, paywall, and product-analytics data.
    func setAccessCohort(_ cohort: String?) {
        accessCohort = cohort
    }

    func capture(_ event: String, properties: [String: Any] = [:]) {
        guard isConfigured else { return }
        var enrichedProperties = commonEventProperties
        properties.forEach { enrichedProperties[$0.key] = $0.value }
        PostHogSDK.shared.capture(event, properties: enrichedProperties)
    }

    /// Returns whether the current PostHog session belongs to an identified
    /// account and therefore needs to be reset when Clerk reports sign-out.
    /// Keeping this decision pure makes the fresh-launch regression testable.
    static func shouldResetIdentity(
        identifiedUserID: String?,
        currentDistinctID: String,
        anonymousID: String
    ) -> Bool {
        if identifiedUserID != nil { return true }
        guard !currentDistinctID.isEmpty, !anonymousID.isEmpty else { return false }
        return currentDistinctID != anonymousID
    }

    private func registerInstallContext() {
        guard isConfigured else { return }
        PostHogSDK.shared.register([
            "analytics_install_id": installID,
            "analytics_schema_version": 3,
        ])
    }

    private var commonEventProperties: [String: Any] {
        let bundle = Bundle.main
        let version = bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown"
        let build = bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "unknown"
#if DEBUG
        let environment = "debug"
#else
        let environment = "production"
#endif
#if targetEnvironment(simulator)
        let isSimulator = true
#else
        let isSimulator = false
#endif
        var properties: [String: Any] = [
            "analytics_schema_version": 3,
            "app_version": version,
            "app_build": build,
            "os_version": ProcessInfo.processInfo.operatingSystemVersionString,
            "platform": "ios",
            "environment": environment,
            "is_simulator": isSimulator,
            "access_cohort": accessCohort ?? "unknown",
            "analytics_install_id": installID,
        ]

        let distinctID = PostHogSDK.shared.getDistinctId()
        let anonymousID = PostHogSDK.shared.getAnonymousId()
        properties["analytics_identity"] =
            (!distinctID.isEmpty && distinctID != anonymousID) ? "identified" : "anonymous"
        if let sessionID = PostHogSDK.shared.getSessionId(), !sessionID.isEmpty {
            properties["analytics_session_id"] = sessionID
        }
        return properties
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
