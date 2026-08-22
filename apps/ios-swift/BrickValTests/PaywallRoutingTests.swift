import Foundation
import Testing
@testable import BrickVal

@MainActor
struct PaywallRoutingTests {
    @Test func upgradeShowsVisibleFallbackWhenPurchaseServicesAreUnavailable() {
        let coordinator = AppSDKCoordinator(
            entitlementStore: EntitlementStore(defaults: testDefaults()),
            purchaseServicesEnabled: false
        )

        #expect(coordinator.superwallConfigured == false)
        #expect(coordinator.presentUpgrade(placement: .subscriptionUpgrade))
        #expect(coordinator.showsSubscriptionFallback)
    }

    @Test func superwallPromoActionStartsOfferCodeRedemption() {
        let coordinator = AppSDKCoordinator(
            entitlementStore: EntitlementStore(defaults: testDefaults()),
            purchaseServicesEnabled: false
        )

        coordinator.handleCustomPaywallAction(withName: "showPromoRedeem")

        #expect(coordinator.offerCodeRedemptionState == .presenting)
    }

    @Test func unknownSuperwallCustomActionDoesNothing() {
        let coordinator = AppSDKCoordinator(
            entitlementStore: EntitlementStore(defaults: testDefaults()),
            purchaseServicesEnabled: false
        )

        coordinator.handleCustomPaywallAction(withName: "not_a_promo_action")

        #expect(coordinator.offerCodeRedemptionState == .idle)
    }

    private func testDefaults() -> UserDefaults {
        let suite = "PaywallRoutingTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return defaults
    }
}
