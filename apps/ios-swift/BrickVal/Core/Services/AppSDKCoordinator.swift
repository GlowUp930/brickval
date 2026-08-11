import ClerkKit
import Observation
import RevenueCat
import Sentry
import SuperwallKit

@Observable
@MainActor
final class AppSDKCoordinator {
    let clerk: Clerk?
    let apiClient: BrickValAPIClient
    private(set) var purchasesConfigured = false
    private(set) var superwallConfigured = false
    private(set) var showsSubscriptionFallback = false

    @ObservationIgnored private var purchaseController: RevenueCatPurchaseController?
    @ObservationIgnored private let entitlementStore: EntitlementStore

    init(entitlementStore: EntitlementStore) {
        self.entitlementStore = entitlementStore
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

        if let dsn = Self.configurationValue("SentryDSN") {
            SentrySDK.start { options in
                options.dsn = dsn
                options.sendDefaultPii = false
                options.enableAutoSessionTracking = true
            }
        }

        let revenueCatKey = Self.configurationValue("RevenueCatAPIKey")
        let superwallKey = Self.configurationValue("SuperwallAPIKey")
        if let revenueCatKey {
            let controller = RevenueCatPurchaseController(entitlementStore: entitlementStore)
            purchaseController = controller
            if let superwallKey {
                Superwall.configure(apiKey: superwallKey, purchaseController: controller)
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
        params: [String: Any]? = nil
    ) -> Bool {
        guard superwallConfigured else {
            showsSubscriptionFallback = true
            return true
        }
        resolveAndRegister(placement: placement, params: params, feature: nil)
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
        resolveAndRegister(placement: placement, params: params, feature: feature)
        return true
    }

    func dismissSubscriptionFallback() {
        showsSubscriptionFallback = false
    }

    func setMonetizationCohort(_ cohort: MonetizationAccessCohort?) {
        guard let cohort else { return }
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
        guard purchasesConfigured else { return }
        if let userID {
            if Purchases.shared.appUserID != userID {
                _ = try? await Purchases.shared.logIn(userID)
            }
            if superwallConfigured { Superwall.shared.identify(userId: userID) }
        } else {
            if !Purchases.shared.isAnonymous {
                _ = try? await Purchases.shared.logOut()
            }
            if superwallConfigured { Superwall.shared.reset() }
        }
    }

    private func resolveAndRegister(
        placement: ProPlacement,
        params: [String: Any]?,
        feature: (@MainActor () -> Void)?
    ) {
        resolve(
            UpgradeRequest(
                placement: placement,
                params: params,
                feature: feature
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
                feature: request.feature
            )
            return
        }

        guard request.placement != .subscriptionUpgrade else {
            showsSubscriptionFallback = true
            return
        }

        var fallbackParams = request.params ?? [:]
        fallbackParams["source_placement"] = request.placement.rawValue
        resolve(
            UpgradeRequest(
                placement: .subscriptionUpgrade,
                params: fallbackParams,
                feature: request.feature
            )
        )
    }

    private func register(
        placement: ProPlacement,
        params: [String: Any]?,
        feature: (@MainActor () -> Void)?
    ) {
        if let feature {
            Superwall.shared.register(placement: placement.rawValue, params: params) {
                Task { @MainActor in feature() }
            }
        } else {
            Superwall.shared.register(placement: placement.rawValue, params: params)
        }
    }

    private static func configurationValue(_ key: String) -> String? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty || trimmed.contains("$(") ? nil : trimmed
    }
}

private struct UpgradeRequest: @unchecked Sendable {
    let placement: ProPlacement
    let params: [String: Any]?
    let feature: (@MainActor () -> Void)?
}
