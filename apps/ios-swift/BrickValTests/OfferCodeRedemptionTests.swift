import Foundation
import StoreKit
import Testing
@testable import BrickVal

@MainActor
struct OfferCodeRedemptionTests {
    @Test func requestPresentsOnlyOnceUntilTheSheetCompletes() async {
        let client = FakeOfferCodeRedemptionClient()
        let coordinator = AppSDKCoordinator(
            entitlementStore: EntitlementStore(defaults: testDefaults()),
            offerCodeClient: client
        )

        coordinator.requestOfferCodeRedemption()
        coordinator.requestOfferCodeRedemption()
        #expect(coordinator.offerCodeRedemptionState == .preparing)
        await Task.yield()

        #expect(coordinator.offerCodeRedemptionState == .presenting)
        #expect(client.syncCallCount == 0)
    }

    @Test func paywallCustomActionDismissesPaywallBeforePresentingRedemptionSheet() async {
        let dismissalGate = DismissalGate()
        let coordinator = AppSDKCoordinator(
            entitlementStore: EntitlementStore(defaults: testDefaults()),
            purchaseServicesEnabled: false,
            dismissPresentedPaywall: {
                await dismissalGate.wait()
            }
        )

        coordinator.handleCustomPaywallAction(withName: "showPromoRedeem")
        #expect(coordinator.offerCodeRedemptionState == .preparing)
        await Task.yield()

        #expect(dismissalGate.waitCount == 1)
        #expect(coordinator.offerCodeRedemptionState == .preparing)
        coordinator.handleCustomPaywallAction(withName: "showPromoRedeem")
        await Task.yield()
        #expect(dismissalGate.waitCount == 1)

        dismissalGate.resume()
        await Task.yield()
        #expect(coordinator.offerCodeRedemptionState == .presenting)
    }

    @Test func successfulRedemptionActivatesProAndReturnsToIdle() async {
        let client = FakeOfferCodeRedemptionClient(syncResult: true)
        let entitlements = EntitlementStore(defaults: testDefaults())
        let coordinator = AppSDKCoordinator(
            entitlementStore: entitlements,
            offerCodeClient: client
        )

        coordinator.requestOfferCodeRedemption()
        await coordinator.completeOfferCodeRedemption(.success(()))

        #expect(client.syncCallCount == 1)
        #expect(entitlements.isPro)
        #expect(coordinator.offerCodeRedemptionState == .idle)
    }

    @Test func cancellingRedemptionDoesNotShowAnError() async {
        let client = FakeOfferCodeRedemptionClient()
        let coordinator = AppSDKCoordinator(
            entitlementStore: EntitlementStore(defaults: testDefaults()),
            offerCodeClient: client
        )

        coordinator.requestOfferCodeRedemption()
        await coordinator.completeOfferCodeRedemption(.failure(StoreKitError.userCancelled))

        #expect(client.syncCallCount == 0)
        #expect(coordinator.offerCodeRedemptionState == .idle)
    }

    @Test func dismissingThePresentationResetsOnlyThePresentationState() async {
        let client = FakeOfferCodeRedemptionClient()
        let coordinator = AppSDKCoordinator(
            entitlementStore: EntitlementStore(defaults: testDefaults()),
            offerCodeClient: client
        )

        coordinator.requestOfferCodeRedemption()
        coordinator.dismissOfferCodeRedemptionPresentation()
        await Task.yield()

        #expect(client.syncCallCount == 0)
        #expect(coordinator.offerCodeRedemptionState == .idle)
    }

    @Test func invalidOrUnconfirmedRedemptionStaysLockedWithRetryableError() async {
        let client = FakeOfferCodeRedemptionClient(syncResult: false)
        let entitlements = EntitlementStore(defaults: testDefaults())
        let coordinator = AppSDKCoordinator(
            entitlementStore: entitlements,
            offerCodeClient: client
        )

        coordinator.requestOfferCodeRedemption()
        await coordinator.completeOfferCodeRedemption(.success(()))

        #expect(entitlements.isPro == false)
        #expect(coordinator.offerCodeRedemptionState == .failed("We couldn't confirm Pro access yet. Try checking again or restore purchases."))

        await coordinator.checkOfferCodeAccess()
        #expect(client.syncCallCount == 2)
    }

    @Test func synchronizationFailureRetainsExistingProAccess() async {
        let defaults = testDefaults()
        defaults.set(true, forKey: "brickvalue_last_known_pro_status")
        let entitlements = EntitlementStore(defaults: defaults)
        let client = FakeOfferCodeRedemptionClient(syncError: .unavailable)
        let coordinator = AppSDKCoordinator(
            entitlementStore: entitlements,
            offerCodeClient: client
        )

        coordinator.requestOfferCodeRedemption()
        await coordinator.completeOfferCodeRedemption(.success(()))

        #expect(entitlements.isPro)
        #expect(coordinator.offerCodeRedemptionState == .failed("We couldn't confirm Pro access yet. Try checking again or restore purchases."))
    }

    private func testDefaults() -> UserDefaults {
        let suite = "OfferCodeRedemptionTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return defaults
    }
}

@MainActor
private final class FakeOfferCodeRedemptionClient: OfferCodeRedemptionClient {
    let syncResult: Bool
    let syncError: OfferCodeTestError?
    private(set) var syncCallCount = 0

    init(syncResult: Bool = false, syncError: OfferCodeTestError? = nil) {
        self.syncResult = syncResult
        self.syncError = syncError
    }

    func syncPurchases() async throws -> Bool {
        syncCallCount += 1
        if let syncError { throw syncError }
        return syncResult
    }
}

@MainActor
private final class DismissalGate {
    private var continuation: CheckedContinuation<Void, Never>?
    private(set) var waitCount = 0

    func wait() async {
        waitCount += 1
        await withCheckedContinuation { continuation in
            self.continuation = continuation
        }
    }

    func resume() {
        continuation?.resume()
        continuation = nil
    }
}

private enum OfferCodeTestError: Error {
    case unavailable
}
