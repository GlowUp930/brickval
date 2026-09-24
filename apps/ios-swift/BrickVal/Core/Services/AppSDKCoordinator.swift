import ClerkKit
import Foundation
import Observation
import RevenueCat
import Sentry
import StoreKit
import SuperwallKit

@Observable
@MainActor
final class AppSDKCoordinator: SuperwallDelegate {
    static func sentryFailedRequestTargets(for baseURL: URL) -> [String] {
        guard let host = baseURL.host, !host.isEmpty else { return [] }
        return [host]
    }

    let clerk: Clerk?
    let apiClient: BrickValAPIClient
    let analytics: PostHogAnalytics
    private(set) var purchasesConfigured = false
    private(set) var superwallConfigured = false
    private(set) var showsSubscriptionFallback = false
    private(set) var paywallPresentationError: String?
    private(set) var offerCodeRedemptionState: OfferCodeRedemptionState = .idle
    var purchaseRestrictionGuide: PurchaseRestrictionGuideContext?

    var superwallSeed: Int? {
        guard superwallConfigured else { return nil }
        if let seed = Superwall.shared.userAttributes["seed"] as? Int {
            return seed
        }
        if let seed = Superwall.shared.userAttributes["seed"] as? NSNumber {
            return seed.intValue
        }
        return nil
    }

    @ObservationIgnored private var purchaseController: RevenueCatPurchaseController?
    @ObservationIgnored private var offerCodeClient: (any OfferCodeRedemptionClient)?
    @ObservationIgnored private let entitlementStore: EntitlementStore
    @ObservationIgnored private let notificationCoordinator: NotificationCoordinator
    @ObservationIgnored private let dismissPresentedPaywall: @MainActor () async -> Void
    @ObservationIgnored private var pendingManualDismissal: (@MainActor () -> Void)?
    @ObservationIgnored private var pendingManualDismissalPlacement: ProPlacement?

    init(
        entitlementStore: EntitlementStore,
        notificationCoordinator: NotificationCoordinator = NotificationCoordinator(),
        offerCodeClient: (any OfferCodeRedemptionClient)? = nil,
        purchaseServicesEnabled: Bool = true,
        dismissPresentedPaywall: @escaping @MainActor () async -> Void = {
            guard Superwall.isInitialized else { return }
            await Superwall.shared.dismiss()
        }
    ) {
        self.entitlementStore = entitlementStore
        self.notificationCoordinator = notificationCoordinator
        self.offerCodeClient = offerCodeClient
        self.dismissPresentedPaywall = dismissPresentedPaywall
        analytics = PostHogAnalytics(apiKey: Self.configurationValue("PostHogAPIKey"))
        entitlementStore.onProActivation = { [analytics] source, isTrial in
            var properties: [String: Any] = ["activation_source": source]
            properties["is_trial"] = isTrial
            analytics.capture(PostHogEvent.proAccessActivated, properties: properties)
        }
        let clerkKey = Self.configurationValue("ClerkPublishableKey")
        if let clerkKey {
            Clerk.configure(publishableKey: clerkKey)
            clerk = Clerk.shared
            apiClient = BrickValAPIClient.live(authToken: {
                try? await Clerk.shared.auth.getToken()
            })
        } else {
#if DEBUG
            clerk = .mockSignedOut
#else
            clerk = nil
#endif
            apiClient = .live()
        }

#if !DEBUG
        if let dsn = Self.configurationValue("SentryDSN") {
            SentrySDK.start { options in
                options.dsn = dsn
                let bundle = Bundle.main
                let version = bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown"
                let build = bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "unknown"
                options.releaseName = "com.brickval.app@\(version)+\(build)"
                options.environment = "production"
                options.sendDefaultPii = false
                options.enableAutoSessionTracking = true
                options.failedRequestTargets = Self.sentryFailedRequestTargets(
                    for: APIConfiguration.live.baseURL
                )
            }
        }
#endif

        guard purchaseServicesEnabled else { return }

        let revenueCatKey = Self.configurationValue("RevenueCatAPIKey")
        let superwallKey = Self.configurationValue("SuperwallAPIKey")
        if let revenueCatKey {
            let controller = RevenueCatPurchaseController(
                entitlementStore: entitlementStore,
                notificationCoordinator: notificationCoordinator,
                recordAttempt: { [analytics] event, fields in
                    PurchaseAttempt.record(event: event, properties: fields, analytics: analytics)
                }
            )
            purchaseController = controller
            controller.onPurchaseRestriction = { [weak self] _, placement in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    await self.dismissPresentedPaywall()
                    self.purchaseRestrictionGuide = PurchaseRestrictionGuideContext(placement: placement)
                }
            }
            if self.offerCodeClient == nil {
                self.offerCodeClient = controller
            }
            Purchases.configure(withAPIKey: revenueCatKey)
            purchasesConfigured = true
            if let distinctID = analytics.distinctID {
                Purchases.shared.attribution.setAttributes(["$posthogUserId": distinctID])
            }
            if let superwallKey {
                Superwall.configure(apiKey: superwallKey, purchaseController: controller)
                // Superwall otherwise reads the device-wide locale list. Keep
                // its paywall language aligned with the app's effective
                // localization, including the user's in-app language choice.
                Superwall.shared.localeIdentifier = BrickValLocalization.effectiveLanguage.locale.identifier
                Superwall.shared.delegate = self
                superwallConfigured = true
            }
            entitlementStore.beginLoading()
            controller.startSyncing()
        }
    }

    func updateLocalization(_ language: BrickValLanguage) {
        guard superwallConfigured else { return }
        Superwall.shared.localeIdentifier = language.locale.identifier
    }

    func presentUpgrade() {
        _ = presentUpgrade(placement: .subscriptionUpgrade)
    }

    func retryAfterPurchaseRestriction(placement: String?) {
        guard AppStore.canMakePayments else { return }
        _ = presentUpgrade(placement: placement.flatMap(ProPlacement.init(rawValue:)) ?? .subscriptionUpgrade)
    }

    @discardableResult
    func presentUpgrade(
        placement: ProPlacement,
        params: [String: Any]? = nil,
        manualDismissal: (@MainActor () -> Void)? = nil
    ) -> Bool {
        analytics.capture(
            PostHogEvent.upgradeRequested,
            properties: ["placement": placement.rawValue]
        )
        guard superwallConfigured else {
            showsSubscriptionFallback = true
            return true
        }
        showsSubscriptionFallback = false
        paywallPresentationError = nil
        if placement == .subscriptionUpgrade {
            register(
                placement: placement,
                params: params,
                feature: nil,
                manualDismissal: manualDismissal
            )
        } else {
            resolveAndRegister(
                placement: placement,
                params: params,
                feature: nil,
                manualDismissal: manualDismissal
            )
        }
        return true
    }

    @discardableResult
    func presentProFeature(
        placement: ProPlacement,
        params: [String: Any]? = nil,
        feature: @escaping @MainActor () -> Void
    ) -> Bool {
        analytics.capture(
            PostHogEvent.upgradeRequested,
            properties: [
                "placement": placement.rawValue,
                "source": "pro_feature",
            ]
        )
        guard superwallConfigured else {
            showsSubscriptionFallback = true
            return true
        }
        paywallPresentationError = nil
        resolveAndRegister(placement: placement, params: params, feature: feature)
        return true
    }

    func dismissSubscriptionFallback() {
        showsSubscriptionFallback = false
    }

    func dismissPaywallPresentationError() {
        paywallPresentationError = nil
    }

    func isFeatureEnabled(_ key: String) -> Bool {
        analytics.isFeatureEnabled(key)
    }

    func reloadFeatureFlags() {
        analytics.reloadFeatureFlags()
    }

    func handleCustomPaywallAction(withName name: String) {
        guard name == Self.showPromoRedeemAction else { return }
        analytics.capture(
            PostHogEvent.offerCodeRedeemTapped,
            properties: ["action": name, "source": "paywall"]
        )
        requestOfferCodeRedemption()
    }

    var isOfferCodeRedemptionBusy: Bool {
        switch offerCodeRedemptionState {
        case .preparing, .presenting, .confirming:
            true
        case .idle, .failed:
            false
        }
    }

    func requestOfferCodeRedemption() {
        guard !isOfferCodeRedemptionBusy else { return }
        offerCodeRedemptionState = .preparing

        // A custom Superwall action leaves the paywall on screen. StoreKit's
        // redemption controller must be the only sheet in the presentation
        // stack, otherwise a later paywall purchase can appear over the code
        // form (or make the form look unresponsive). Wait for dismissal before
        // allowing the root view to present StoreKit.
        purchaseController?.setPurchasePlacement(nil)
        pendingManualDismissal = nil
        pendingManualDismissalPlacement = nil
        Task { @MainActor [weak self] in
            guard let self else { return }
            await dismissPresentedPaywall()
            guard offerCodeRedemptionState == .preparing else { return }
            offerCodeRedemptionState = .presenting
        }
    }

    func dismissOfferCodeRedemptionPresentation() {
        guard offerCodeRedemptionState == .preparing || offerCodeRedemptionState == .presenting else { return }
        offerCodeRedemptionState = .idle
    }

    func completeOfferCodeRedemption(_ result: Result<Void, Error>) async {
        switch result {
        case .success:
            await checkOfferCodeAccess()
        case .failure(let error):
            if case StoreKitError.userCancelled = error {
                offerCodeRedemptionState = .idle
            } else {
                offerCodeRedemptionState = .failed("We couldn't redeem that offer code. Please try again.")
            }
        }
    }

    func checkOfferCodeAccess() async {
        guard offerCodeRedemptionState != .confirming else { return }
        offerCodeRedemptionState = .confirming

        guard let offerCodeClient else {
            offerCodeRedemptionState = .failed("Offer codes aren't available in this build.")
            return
        }

        do {
            let isPro = try await offerCodeClient.syncPurchases()
            if isPro {
                entitlementStore.update(isPro: true, source: "offer_code")
                offerCodeRedemptionState = .idle
            } else {
                offerCodeRedemptionState = .failed("We couldn't confirm Pro access yet. Try checking again or restore purchases.")
            }
        } catch {
            offerCodeRedemptionState = .failed("We couldn't confirm Pro access yet. Try checking again or restore purchases.")
        }
    }

    func didDismissPaywall(withInfo paywallInfo: PaywallInfo) {
        let paywallViewID = purchaseController?.paywallViewID
        purchaseController?.setPurchasePlacement(nil)
        purchaseController?.clearPaywallViewID()
        var properties: [String: Any] = [
            "placement": String(describing: paywallInfo.presentedByPlacementWithName),
            "close_reason": String(describing: paywallInfo.closeReason),
        ]
        properties["paywall_view_id"] = paywallViewID
        analytics.capture(
            PostHogEvent.paywallDismissed,
            properties: properties
        )
        guard let pendingManualDismissal,
              pendingManualDismissalPlacement?.rawValue == paywallInfo.presentedByPlacementWithName else {
            return
        }

        self.pendingManualDismissal = nil
        pendingManualDismissalPlacement = nil

        guard paywallInfo.closeReason == .manualClose else { return }
        pendingManualDismissal()
    }

    func setMonetizationCohort(_ cohort: MonetizationAccessCohort?) {
        analytics.setAccessCohort(cohort?.rawValue)
        guard let cohort else { return }
        notificationCoordinator.setAccessCohort(cohort.rawValue)
        let attributes = [
            "access_cohort": cohort.rawValue,
            "access_experiment": "new_user_scan_gate_v1",
        ]
        if superwallConfigured {
            Superwall.shared.setUserAttributes(attributes)
        }
        if purchasesConfigured {
            Purchases.shared.attribution.setAttributes(attributes)
        }
    }

    func restorePurchases() async throws {
        guard purchasesConfigured else { return }
        let info = try await Purchases.shared.restorePurchases()
        let isPro = info.entitlements["pro"]?.isActive == true
        entitlementStore.update(isPro: isPro, source: "restore",
                                isTrial: info.entitlements["pro"].map { $0.periodType == .trial })
        if let purchaseController {
            purchaseController.startSyncing()
        }
        if superwallConfigured {
            let active = Set(info.entitlements.activeInCurrentEnvironment.keys.map { Entitlement(id: $0) })
            Superwall.shared.subscriptionStatus = active.isEmpty ? .inactive : .active(active)
        }
    }

    func synchronizeIdentity(userID: String?) async {
        notificationCoordinator.setSubscriberID(userID)
        if let userID {
            analytics.identify(userID: userID, isPro: entitlementStore.isPro)
        } else {
            analytics.reset()
        }
        guard purchasesConfigured else { return }
        if let userID {
            if Purchases.shared.appUserID != userID {
                _ = try? await Purchases.shared.logIn(userID)
            }
            await synchronizeServerEntitlement()
            if superwallConfigured { Superwall.shared.identify(userId: userID) }
        } else {
            if !Purchases.shared.isAnonymous {
                _ = try? await Purchases.shared.logOut()
            }
            if superwallConfigured { Superwall.shared.reset() }
        }
        if let distinctID = analytics.distinctID {
            Purchases.shared.attribution.setAttributes(["$posthogUserId": distinctID])
        }
    }

    func synchronizeServerEntitlement() async {
        guard purchasesConfigured else { return }
        guard let result = try? await apiClient.syncSubscription(), result.verified, result.isPro else {
            return
        }
        entitlementStore.update(isPro: true, source: "server_sync")
    }

    private func resolveAndRegister(
        placement: ProPlacement,
        params: [String: Any]?,
        feature: (@MainActor () -> Void)?,
        manualDismissal: (@MainActor () -> Void)? = nil
    ) {
        resolve(
            UpgradeRequest(
                placement: placement,
                params: params,
                feature: feature,
                manualDismissal: manualDismissal
            )
        )
    }

    private func resolve(_ request: UpgradeRequest) {
        Superwall.shared.getPresentationResult(
            forPlacement: request.placement.rawValue,
            params: request.params
        ) { @Sendable [weak self, request] result in
            self?.receive(result, for: request)
        }
    }

    private nonisolated func receive(_ result: PresentationResult, for request: UpgradeRequest) {
        Task { @MainActor [weak self, request] in
            self?.handle(result, for: request)
        }
    }

    private func handle(_ result: PresentationResult, for request: UpgradeRequest) {
        if case .paywall = result {
            register(
                placement: request.placement,
                params: request.params,
                feature: request.feature,
                manualDismissal: request.manualDismissal
            )
            return
        }

        if request.placement == .subscriptionUpgrade {
            register(
                placement: request.placement,
                params: request.params,
                feature: request.feature,
                manualDismissal: request.manualDismissal
            )
            return
        }

        var fallbackParams = request.params ?? [:]
        fallbackParams["source_placement"] = request.placement.rawValue
        register(
            placement: .subscriptionUpgrade,
            params: fallbackParams,
            feature: request.feature,
            manualDismissal: nil
        )
    }

    private func register(
        placement: ProPlacement,
        params: [String: Any]?,
        feature: (@MainActor () -> Void)?,
        manualDismissal: (@MainActor () -> Void)?
    ) {
        purchaseController?.setPurchasePlacement(placement.rawValue)
        pendingManualDismissal = manualDismissal
        pendingManualDismissalPlacement = manualDismissal == nil ? nil : placement

        let presentationHandler = PaywallPresentationHandler()
        presentationHandler.onPresent { [weak self] _ in
            Task { @MainActor [weak self] in
                let paywallViewID = UUID().uuidString
                self?.purchaseController?.setPaywallViewID(paywallViewID)
                self?.analytics.capture(
                    PostHogEvent.paywallPresented,
                    properties: [
                        "placement": placement.rawValue,
                        "source_placement": (params?["source_placement"] as? String) ?? placement.rawValue,
                        "paywall_view_id": paywallViewID,
                    ]
                )
                self?.showsSubscriptionFallback = false
                self?.paywallPresentationError = nil
            }
        }
        presentationHandler.onSkip { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.handlePaywallPresentationFailure(placement: placement, reason: "skipped")
            }
        }
        presentationHandler.onError { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.handlePaywallPresentationFailure(placement: placement, reason: "error")
            }
        }

        if let feature {
            Superwall.shared.register(
                placement: placement.rawValue,
                params: params,
                handler: presentationHandler
            ) {
                Task { @MainActor in feature() }
            }
        } else {
            Superwall.shared.register(
                placement: placement.rawValue,
                params: params,
                handler: presentationHandler
            )
        }
    }

    private func handlePaywallPresentationFailure(placement: ProPlacement, reason: String) {
        analytics.capture(
            PostHogEvent.paywallPresentationFailed,
            properties: [
                "placement": placement.rawValue,
                "reason": reason,
            ]
        )
        purchaseController?.setPurchasePlacement(nil)
        purchaseController?.clearPaywallViewID()
        pendingManualDismissal = nil
        pendingManualDismissalPlacement = nil
        showsSubscriptionFallback = false
        paywallPresentationError = BrickValLocalization.localized("We couldn't load the upgrade options. Please try again.")
    }

    private static func configurationValue(_ key: String) -> String? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty || trimmed.contains("$(") ? nil : trimmed
    }

    private static let showPromoRedeemAction = "showPromoRedeem"
}

private struct UpgradeRequest: @unchecked Sendable {
    let placement: ProPlacement
    let params: [String: Any]?
    let feature: (@MainActor () -> Void)?
    let manualDismissal: (@MainActor () -> Void)?
}
