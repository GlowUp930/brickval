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
            controller.startSyncing()
        }
    }

    func presentUpgrade() {
        guard superwallConfigured else { return }
        Superwall.shared.register(placement: "brickval_upgrade")
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

    private static func configurationValue(_ key: String) -> String? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty || trimmed.contains("$(") ? nil : trimmed
    }
}
