import Foundation
import Testing
@testable import BrickVal

@MainActor
struct EntitlementStoreTests {
    @Test func freeToProTransitionPresentsWelcomeOnce() {
        let context = context()
        let store = EntitlementStore(defaults: context.defaults)

        store.update(isPro: false)
        #expect(store.shouldPresentProWelcome == false)

        store.update(isPro: true)
        #expect(store.shouldPresentProWelcome)

        store.update(isPro: true)
        #expect(store.shouldPresentProWelcome)

        store.dismissProWelcome()
        store.update(isPro: true)
        #expect(store.shouldPresentProWelcome == false)
    }

    @Test func aLaterReactivationPresentsWelcomeAgain() {
        let context = context()
        let store = EntitlementStore(defaults: context.defaults)

        store.update(isPro: true)
        store.dismissProWelcome()
        store.update(isPro: false)
        store.update(isPro: true)

        #expect(store.shouldPresentProWelcome)
    }

    private func context() -> (defaults: UserDefaults, suite: String) {
        let suite = "EntitlementStoreTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return (defaults, suite)
    }
}
