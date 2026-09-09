import Foundation
import RevenueCat
import StoreKit
import SuperwallKit
import Testing
@testable import BrickVal

@MainActor
struct PurchaseAttemptTests {
    private let productID = "com.brickval.app.pro.yearly"

    @Test func rejectionThenExplicitRetrySharesCustomerButNotAttempt() async throws {
        let harness = Harness()
        var calls = 0
        let failure = await harness.controller.performPurchase(productID: productID) {
            calls += 1
            throw Product.PurchaseError.purchaseNotAllowed
        }
        guard case .failed(let error) = failure else { Issue.record("Expected rejection"); return }
        #expect(error.localizedDescription.contains("Screen Time"))
        #expect(!harness.entitlements.isPro)
        #expect(harness.entitlements.pendingNewPurchase == nil)
        #expect(calls == 1)
        #expect(harness.events.count == 2)
        let failed = try #require(harness.events.last)
        #expect(harness.events.first?["attempt_id"] as? String == failed["attempt_id"] as? String)
        #expect(failed["outcome"] as? String == "failed")
        #expect(failed["can_make_payments"] as? Bool == false)
        #expect(failed["elapsed_ms"] as? Int == 250)
        let captured = try #require(harness.reporter.attempts.first)
        #expect(captured["attempt_id"] as? String == failed["attempt_id"] as? String)
        #expect(captured["customer_hash"] as? String == failed["customer_hash"] as? String)
        let chain = try #require(captured["error_chain"] as? [[String: Any]])
        #expect(chain.first?["domain"] as? String == "StoreKit.Product.PurchaseError")
        #expect(chain.first?["code"] as? Int == 2)

        let success = await harness.controller.performPurchase(productID: productID) {
            calls += 1
            return RevenueCatPurchaseOutcome(userCancelled: false, customerInfo: customerInfo())
        }
        guard case .purchased = success else { Issue.record("Expected success"); return }
        #expect(calls == 2)
        #expect(harness.entitlements.isPro)
        #expect(harness.entitlements.pendingNewPurchase?.productID == productID)
        let succeeded = try #require(harness.events.last)
        #expect(succeeded["outcome"] as? String == "purchased")
        #expect(succeeded["attempt_id"] as? String != failed["attempt_id"] as? String)
        #expect(succeeded["customer_hash"] as? String == failed["customer_hash"] as? String)
        #expect(harness.reporter.attempts.count == 1)
    }

    @Test func cancellationAndPendingDoNotReportFailureOrGrantPro() async {
        let harness = Harness()
        let cancelled = await harness.controller.performPurchase(productID: productID) {
            throw StoreKitError.userCancelled
        }
        guard case .cancelled = cancelled else { Issue.record("Expected cancellation"); return }
        #expect(harness.events.last?["outcome"] as? String == "cancelled")
        let pending = await harness.controller.performPurchase(productID: productID) {
            throw NSError(domain: "RevenueCat.ErrorCode", code: ErrorCode.paymentPendingError.rawValue)
        }
        guard case .pending = pending else { Issue.record("Expected pending approval"); return }
        #expect(harness.events.last?["outcome"] as? String == "pending")
        let returnedCancellation = await harness.controller.performPurchase(productID: productID) {
            RevenueCatPurchaseOutcome(userCancelled: true, customerInfo: customerInfo())
        }
        guard case .cancelled = returnedCancellation else { Issue.record("Expected cancellation flag"); return }
        #expect(!harness.entitlements.isPro)
        #expect(harness.entitlements.pendingNewPurchase == nil)
        #expect(harness.reporter.attempts.isEmpty)
        #expect(harness.events.count == 6)
    }

    @Test func restorationUpdatesEntitlementWithoutNewPurchaseWelcome() async {
        let harness = Harness()
        let result = await harness.controller.performRestoration { customerInfo() }
        guard case .restored = result else { Issue.record("Expected restored"); return }
        #expect(harness.entitlements.isPro)
        #expect(harness.entitlements.pendingNewPurchase == nil)
        #expect(harness.events.last?["operation"] as? String == "restore")
        #expect(harness.events.last?["outcome"] as? String == "restored")
    }

    @Test func originalRevenueCatAppleRejectionRetainsBothCodesAndPlacement() async throws {
        let harness = Harness()
        let result = await harness.controller.performPurchase(productID: productID) {
            harness.controller.setPurchasePlacement("another_screen")
            throw NSError(domain: "RevenueCat.ErrorCode", code: 3, userInfo: [
                NSUnderlyingErrorKey: NSError(domain: "StoreKit.Product.PurchaseError", code: 2)
            ])
        }
        guard case .failed = result else { Issue.record("Expected failure"); return }
        let fields = try #require(harness.reporter.attempts.first)
        #expect(fields["purchase_placement"] as? String == "brickval_upgrade")
        let chain = try #require(fields["error_chain"] as? [[String: Any]])
        #expect(chain.count == 2)
        #expect(chain.first?["code"] as? Int == 3)
        #expect(chain.last?["code"] as? Int == 2)
        #expect(!harness.entitlements.isPro)
    }

    @Test func failedRestoreCanBeExplicitlyRetried() async {
        let harness = Harness()
        let failure = await harness.controller.performRestoration { throw URLError(.notConnectedToInternet) }
        guard case .failed = failure else { Issue.record("Expected failed restore"); return }
        #expect(!harness.entitlements.isPro)
        #expect(harness.reporter.attempts.count == 1)
        let failedID = harness.events.last?["attempt_id"] as? String
        let result = await harness.controller.performRestoration { customerInfo() }
        guard case .restored = result else { Issue.record("Expected restored"); return }
        #expect(harness.events.last?["attempt_id"] as? String != failedID)
        #expect(harness.events.last?["pro_active"] as? Bool == true)
        #expect(harness.entitlements.isPro)
        #expect(harness.entitlements.pendingNewPurchase == nil)
    }

    @Test func typedUnderlyingAndRevenueCatRootCodesAreCapturedWithoutPayloads() throws {
        let attempt = PurchaseAttempt(customerID: nil, productID: productID,
            placement: nil, operation: "purchase", canMakePayments: true,
            storefrontID: nil, storefrontCountry: nil, build: "171", osVersion: "26.5", uptime: 10)
        let error = StoreKitError.systemError(NSError(domain: "ASDErrorDomain", code: 500, userInfo: [
            "rc_root_error": ["domain": "AMSErrorDomain", "code": 100, "message": "secret"]
        ]))
        let fields = attempt.properties(outcome: "failed", uptime: 11, error: error)
        let chain = try #require(fields["error_chain"] as? [[String: Any]])
        #expect(chain.count == 3)
        #expect(chain[1]["domain"] as? String == "ASDErrorDomain")
        #expect(chain[2]["domain"] as? String == "AMSErrorDomain")
        #expect(fields["customer_hash"] == nil)
        #expect(fields["storefront_country"] == nil)
    }

    @Test func diagnosticsNeverIncludeRawCustomerOrErrorPayload() throws {
        let attempt = PurchaseAttempt(customerID: "private@example.com", productID: productID,
            placement: "brickval_upgrade", operation: "purchase", canMakePayments: true,
            storefrontID: "143460", storefrontCountry: "AUS", build: "171", osVersion: "26.5", uptime: 10)
        let error = NSError(domain: "RevenueCat.ErrorCode", code: 3, userInfo: [
            NSLocalizedDescriptionKey: "password receipt secret",
            "receipt": "private-receipt",
            NSUnderlyingErrorKey: NSError(domain: "StoreKit.Product.PurchaseError", code: 2,
                userInfo: ["email": "private@example.com"])
        ])
        let properties = attempt.properties(outcome: "failed", uptime: 10.25, error: error)
        let data = try JSONSerialization.data(withJSONObject: properties)
        let json = try #require(String(data: data, encoding: .utf8))
        #expect(!json.contains("private"))
        #expect(!json.contains("password"))
        #expect(!json.contains("receipt"))
        #expect((properties["customer_hash"] as? String)?.count == 64)
        #expect((properties["error_chain"] as? [[String: Any]])?.count == 2)
        #expect(properties["app_build"] as? String == "171")
        #expect(properties["storefront_country"] as? String == "AUS")
    }

    private func customerInfo() -> RevenueCat.CustomerInfo {
        RevenueCat.CustomerInfo(entitlements: EntitlementInfos(entitlements: [
            "pro": EntitlementInfo(identifier: "pro", isActive: true, willRenew: true,
                periodType: .normal, store: .appStore, productIdentifier: productID,
                isSandbox: true, ownershipType: .purchased)
        ]), requestDate: Date(), firstSeen: Date(), originalAppUserId: "test-customer")
    }

    private final class Reporter: PurchaseErrorReporting {
        var attempts: [[String: Any]] = []
        func capture(failure: PurchaseFailure, placement: String?, attempt: [String: Any]) {
            attempts.append(attempt)
        }
    }

    @MainActor private final class Harness {
        let entitlements: BrickVal.EntitlementStore
        let reporter = Reporter()
        var events: [[String: Any]] = []
        var controller: RevenueCatPurchaseController!
        init() {
            let defaults = UserDefaults(suiteName: "PurchaseAttemptTests.\(UUID())")!
            entitlements = BrickVal.EntitlementStore(defaults: defaults)
            controller = RevenueCatPurchaseController(entitlementStore: entitlements,
                notificationCoordinator: NotificationCoordinator(defaults: defaults),
                errorReporter: reporter,
                attemptFactory: { productID, placement, operation in
                    PurchaseAttempt(customerID: "test-customer", productID: productID,
                        placement: placement, operation: operation, canMakePayments: false,
                        storefrontID: "143460", storefrontCountry: "AUS", build: "171",
                        osVersion: "26.5", uptime: 10)
                }, uptime: { 10.25 },
                recordAttempt: { [weak self] _, fields in self?.events.append(fields) },
                publishSubscription: { _ in })
            controller.setPurchasePlacement("brickval_upgrade")
        }
    }
}
