import Foundation
import Testing
@testable import BrickVal

@MainActor
struct EntitlementStoreTests {
    @Test func entitlementRefreshDoesNotTreatRestoreAsANewPurchase() {
        let context = context()
        let store = EntitlementStore(defaults: context.defaults)

        store.update(isPro: false)
        #expect(store.shouldPresentProWelcome == false)

        store.update(isPro: true)
        #expect(store.shouldPresentProWelcome == false)

        store.update(isPro: true)
        #expect(store.shouldPresentProWelcome == false)
    }

    @Test func aSuccessfulPurchaseExplicitlyPresentsWelcome() {
        let context = context()
        let store = EntitlementStore(defaults: context.defaults)

        store.recordNewPurchase(productID: "com.brickval.app.pro.yearly", isTrial: true)

        #expect(store.shouldPresentProWelcome)
        #expect(store.pendingNewPurchase?.productID == "com.brickval.app.pro.yearly")
        #expect(store.pendingNewPurchase?.isTrial == true)

        store.clearPendingNewPurchase()
        store.dismissProWelcome()
        #expect(store.pendingNewPurchase == nil)
    }

    @Test func cachedProAccessIsAvailableWhileFreshStatusLoads() {
        let context = context()
        context.defaults.set(true, forKey: "brickvalue_last_known_pro_status")

        let store = EntitlementStore(defaults: context.defaults)
        store.beginLoading()

        #expect(store.isPro)
        #expect(store.isLoading)
    }

    private func context() -> (defaults: UserDefaults, suite: String) {
        let suite = "EntitlementStoreTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return (defaults, suite)
    }
}
