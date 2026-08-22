import ClerkKit
import Observation
import RevenueCat
import Sentry
import StoreKit
import SuperwallKit

@Observable
@MainActor
final class AppSDKCoordinator: SuperwallDelegate {
    let clerk: Clerk?
    let apiClient: BrickValAPIClient
    private(set) var purchasesConfigured = false
    private(set) var superwallConfigured = false
    private(set) var showsSubscriptionFallback = false
    private(set) var paywallPresentationError: String?
    private(set) var offerCodeRedemptionState: OfferCodeRedemptionState = .idle

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
    @ObservationIgnored private var pendingManualDismissal: (@MainActor () -> Void)?
    @ObservationIgnored private var pendingManualDismissalPlacement: ProPlacement?

    init(
        entitlementStore: EntitlementStore,
        notificationCoordinator: NotificationCoordinator = NotificationCoordinator(),
        offerCodeClient: (any OfferCodeRedemptionClient)? = nil,
        purchaseServicesEnabled: Bool = true
    ) {
        self.entitlementStore = entitlementStore
        self.notificationCoordinator = notificationCoordinator
        self.offerCodeClient = offerCodeClient
        let clerkKey = Self.configurationValue("ClerkPublishableKey")
        if let clerkKey {
            Clerk.configure(publishableKey: clerkKey)
            clerk = Clerk.shared
            apiClient = BrickValAPIClient.live(authToken: {
                try? await Clerk.shared.auth.getToken()
            })
        } else {
            clerk = nil
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
            }
        }
#endif

        guard purchaseServicesEnabled else { return }

        let revenueCatKey = Self.configurationValue("RevenueCatAPIKey")
        let superwallKey = Self.configurationValue("SuperwallAPIKey")
        if let revenueCatKey {
            let controller = RevenueCatPurchaseController(
                entitlementStore: entitlementStore,
                notificationCoordinator: notificationCoordinator
            )
            purchaseController = controller
            if self.offerCodeClient == nil {
                self.offerCodeClient = controller
            }
            if let superwallKey {
                Superwall.configure(apiKey: superwallKey, purchaseController: controller)
                Superwall.shared.delegate = self
                superwallConfigured = true
            }
            Purchases.configure(withAPIKey: revenueCatKey)
            purchasesConfigured = true
            entitlementStore.beginLoading()
            controller.startSyncing()
        }
    }

    func presentUpgrade() {
        _ = presentUpgrade(placement: .subscriptionUpgrade)
    }

    @discardableResult
    func presentUpgrade(
        placement: ProPlacement,
        params: [String: Any]? = nil,
        manualDismissal: (@MainActor () -> Void)? = nil
    ) -> Bool {
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

    func handleCustomPaywallAction(withName name: String) {
        guard name == Self.showPromoRedeemAction else { return }
        requestOfferCodeRedemption()
    }

    var isOfferCodeRedemptionBusy: Bool {
        switch offerCodeRedemptionState {
        case .presenting, .confirming:
            true
        case .idle, .failed:
            false
        }
    }

    func requestOfferCodeRedemption() {
        guard !isOfferCodeRedemptionBusy else { return }
        offerCodeRedemptionState = .presenting
    }

    func dismissOfferCodeRedemptionPresentation() {
        guard offerCodeRedemptionState == .presenting else { return }
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
                entitlementStore.update(isPro: true)
                offerCodeRedemptionState = .idle
            } else {
                offerCodeRedemptionState = .failed("We couldn't confirm Pro access yet. Try checking again or restore purchases.")
            }
        } catch {
            offerCodeRedemptionState = .failed("We couldn't confirm Pro access yet. Try checking again or restore purchases.")
        }
    }

    func didDismissPaywall(withInfo paywallInfo: PaywallInfo) {
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
        entitlementStore.update(isPro: isPro)
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
    }

    func synchronizeServerEntitlement() async {
        guard purchasesConfigured else { return }
        guard let result = try? await apiClient.syncSubscription(), result.verified, result.isPro else {
            return
        }
        entitlementStore.update(isPro: true)
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
        pendingManualDismissal = manualDismissal
        pendingManualDismissalPlacement = manualDismissal == nil ? nil : placement

        let presentationHandler = PaywallPresentationHandler()
        presentationHandler.onPresent { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.showsSubscriptionFallback = false
                self?.paywallPresentationError = nil
            }
        }
        presentationHandler.onSkip { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.handlePaywallPresentationFailure()
            }
        }
        presentationHandler.onError { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.handlePaywallPresentationFailure()
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

    private func handlePaywallPresentationFailure() {
        pendingManualDismissal = nil
        pendingManualDismissalPlacement = nil
        showsSubscriptionFallback = false
        paywallPresentationError = "We couldn't load the upgrade options. Please try again."
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
