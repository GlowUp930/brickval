import Foundation
import RevenueCat
import StoreKit
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

    @Test func purchaseNotAllowedFailureUsesRecoveryMessage() {
        let failure = PurchaseFailure.from(
            revenueCatCode: 3,
            underlyingDomain: SKErrorDomain,
            underlyingCode: SKError.Code.paymentNotAllowed.rawValue,
            productID: "com.brickval.app.pro.yearly"
        )

        #expect(failure.category == .notAllowed)
        #expect(failure.errorDescription == "Apple couldn't authorize this purchase on this device or account. Check your App Store or Screen Time purchase settings, then try again.")
        #expect(failure.errorDescription != "The device or user is not allowed to make the purchase.")
    }

    @Test func productionStoreKitTwoPurchaseNotAllowedTupleUsesRecoveryMessage() {
        let error = NSError(
            domain: "RevenueCat.ErrorCode",
            code: RevenueCat.ErrorCode.purchaseNotAllowedError.rawValue,
            userInfo: [
                "rc_code_name": "PURCHASE_NOT_ALLOWED",
                "rc_root_error": [
                    "domain": "StoreKit.Product.PurchaseError",
                    "code": 2,
                ],
            ]
        )

        let failure = PurchaseFailure.from(
            error: error,
            productID: "com.brickval.app.pro.yearly"
        )

        #expect(failure.category == .notAllowed)
        #expect(failure.revenueCatCode == RevenueCat.ErrorCode.purchaseNotAllowedError.rawValue)
        #expect(failure.underlyingDomain == "StoreKit.Product.PurchaseError")
        #expect(failure.underlyingCode == 2)
        #expect(failure.errorDescription == "Apple couldn't authorize this purchase on this device or account. Check your App Store or Screen Time purchase settings, then try again.")
    }

    @Test func clientInvalidPurchaseFailureIsClassifiedAsConfiguration() {
        let failure = PurchaseFailure.from(
            revenueCatCode: 3,
            underlyingDomain: SKErrorDomain,
            underlyingCode: SKError.Code.clientInvalid.rawValue,
            productID: "com.brickval.app.pro.monthly"
        )

        #expect(failure.category == .configuration)
        #expect(failure.errorDescription == "This subscription is temporarily unavailable. Please try again later.")
    }

    @Test func purchaseFailureCategoriesPreserveRetryGuidance() {
        let productUnavailable = PurchaseFailure.from(
            revenueCatCode: 5,
            underlyingDomain: nil,
            underlyingCode: nil,
            productID: "com.brickval.app.pro.monthly"
        )
        let network = PurchaseFailure.from(
            revenueCatCode: 10,
            underlyingDomain: nil,
            underlyingCode: nil,
            productID: "com.brickval.app.pro.yearly"
        )

        #expect(productUnavailable.category == .productUnavailable)
        #expect(productUnavailable.errorDescription == "This subscription is temporarily unavailable. Please try again later.")
        #expect(network.category == .network)
        #expect(network.errorDescription == "We couldn't connect to the App Store. Check your connection and try again.")
    }

    @Test func revenueCatPurchaseErrorPreservesStoreKitDiagnostics() {
        let error = NSError(
            domain: "RevenueCat.ErrorCode",
            code: 3,
            userInfo: [
                "rc_code_name": "PURCHASE_NOT_ALLOWED",
                "rc_root_error": [
                    "domain": SKErrorDomain,
                    "code": SKError.Code.paymentNotAllowed.rawValue,
                    "storeKitError": [
                        "skErrorCode": SKError.Code.paymentNotAllowed.rawValue,
                    ],
                ],
            ]
        )

        let failure = PurchaseFailure.from(
            error: error,
            productID: "com.brickval.app.pro.yearly"
        )

        #expect(failure.category == .notAllowed)
        #expect(failure.revenueCatCode == 3)
        #expect(failure.underlyingDomain == SKErrorDomain)
        #expect(failure.underlyingCode == SKError.Code.paymentNotAllowed.rawValue)
        #expect(failure.diagnosticProperties["product_id"] == "com.brickval.app.pro.yearly")
        #expect(failure.diagnosticProperties["revenuecat_error_code"] == "3")
        #expect(failure.diagnosticProperties["storekit_error_domain"] == SKErrorDomain)
        #expect(failure.diagnosticProperties["storekit_error_code"] == String(SKError.Code.paymentNotAllowed.rawValue))
    }

    @Test func cancellationAndPendingFailuresRemainNonAlertingOutcomes() {
        let cancelled = PurchaseFailure.from(
            revenueCatCode: 1,
            underlyingDomain: SKErrorDomain,
            underlyingCode: SKError.Code.paymentCancelled.rawValue,
            productID: "com.brickval.app.pro.monthly"
        )
        let pending = PurchaseFailure.from(
            revenueCatCode: 20,
            underlyingDomain: nil,
            underlyingCode: nil,
            productID: "com.brickval.app.pro.monthly"
        )

        #expect(cancelled.category == .cancelled)
        #expect(pending.category == .pending)
    }

    @Test func directStoreKitPaymentNotAllowedErrorIsNormalized() {
        let error = NSError(
            domain: SKErrorDomain,
            code: SKError.Code.paymentNotAllowed.rawValue,
            userInfo: [NSLocalizedDescriptionKey: "The device or user is not allowed to make the purchase."]
        )

        let failure = PurchaseFailure.from(
            error: error,
            productID: "com.brickval.app.pro.yearly"
        )

        #expect(failure.category == .notAllowed)
        #expect(failure.errorDescription?.contains("device or account") == true)
        #expect(failure.underlyingDomain == SKErrorDomain)
        #expect(failure.underlyingCode == SKError.Code.paymentNotAllowed.rawValue)
    }

    @Test func missingStoreKitProductUsesUnavailableMessage() {
        let failure = PurchaseFailure.from(
            error: PurchasingError.storeKitProductMissing,
            productID: "com.brickval.app.pro.monthly"
        )

        #expect(failure.category == .productUnavailable)
        #expect(failure.errorDescription == "This subscription is temporarily unavailable. Please try again later.")
    }

    @Test func typedRevenueCatErrorsUseTheirStableCodes() {
        let notAllowed = PurchaseFailure.from(
            error: RevenueCat.ErrorCode.purchaseNotAllowedError,
            productID: "com.brickval.app.pro.yearly"
        )
        let pending = PurchaseFailure.from(
            error: RevenueCat.ErrorCode.paymentPendingError,
            productID: "com.brickval.app.pro.monthly"
        )

        #expect(notAllowed.category == .notAllowed)
        #expect(notAllowed.revenueCatCode == RevenueCat.ErrorCode.purchaseNotAllowedError.rawValue)
        #expect(pending.category == .pending)
        #expect(pending.revenueCatCode == RevenueCat.ErrorCode.paymentPendingError.rawValue)
    }

    @Test func storeKitTwoCancellationRemainsSilent() {
        let failure = PurchaseFailure.from(
            error: StoreKitError.userCancelled,
            productID: "com.brickval.app.pro.monthly"
        )

        #expect(failure.category == .cancelled)
    }

    @Test func directNetworkFailureUsesRetryMessage() {
        let failure = PurchaseFailure.from(
            error: URLError(.notConnectedToInternet),
            productID: "com.brickval.app.pro.yearly"
        )

        #expect(failure.category == .network)
        #expect(failure.errorDescription == "We couldn't connect to the App Store. Check your connection and try again.")
    }

    private func testDefaults() -> UserDefaults {
        let suite = "PaywallRoutingTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return defaults
    }
}
