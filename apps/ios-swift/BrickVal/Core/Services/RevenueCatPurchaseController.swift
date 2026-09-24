import RevenueCat
import StoreKit
import SuperwallKit

@MainActor
protocol RevenueCatPurchaseClient: AnyObject {
    func purchase(product: RevenueCat.StoreProduct) async throws -> RevenueCatPurchaseOutcome
}

struct RevenueCatPurchaseOutcome {
    let userCancelled: Bool
    let customerInfo: RevenueCat.CustomerInfo
}

@MainActor
private final class LiveRevenueCatPurchaseClient: RevenueCatPurchaseClient {
    func purchase(product: RevenueCat.StoreProduct) async throws -> RevenueCatPurchaseOutcome {
        let result = try await Purchases.shared.purchase(product: product)
        return RevenueCatPurchaseOutcome(
            userCancelled: result.userCancelled,
            customerInfo: result.customerInfo
        )
    }
}

@MainActor
final class RevenueCatPurchaseController: PurchaseController, OfferCodeRedemptionClient {
    private let entitlementStore: EntitlementStore
    private let notificationCoordinator: NotificationCoordinator
    private let purchaseClient: any RevenueCatPurchaseClient
    private let errorReporter: any PurchaseErrorReporting
    private let attemptFactory: @MainActor (String?, String?, String?, String) -> PurchaseAttempt
    private let uptime: () -> TimeInterval
    private let canMakePayments: () -> Bool
    private let recordAttempt: (String, [String: Any]) -> Void
    private let publishSubscription: (RevenueCat.CustomerInfo) -> Void
    var onPurchaseRestriction: (@MainActor (PurchaseFailure, String?) -> Void)?
    private var syncTasks: [Task<Void, Never>] = []
    private(set) var purchasePlacement: String?
    private(set) var paywallViewID: String?

    init(
        entitlementStore: EntitlementStore,
        notificationCoordinator: NotificationCoordinator,
        purchaseClient: (any RevenueCatPurchaseClient)? = nil,
        errorReporter: (any PurchaseErrorReporting)? = nil,
        attemptFactory: @escaping @MainActor (String?, String?, String?, String) -> PurchaseAttempt = PurchaseAttempt.live,
        uptime: @escaping () -> TimeInterval = { ProcessInfo.processInfo.systemUptime },
        canMakePayments: @escaping () -> Bool = { AppStore.canMakePayments },
        recordAttempt: @escaping (String, [String: Any]) -> Void = { _, _ in },
        publishSubscription: ((RevenueCat.CustomerInfo) -> Void)? = nil
    ) {
        self.entitlementStore = entitlementStore
        self.notificationCoordinator = notificationCoordinator
        self.purchaseClient = purchaseClient ?? LiveRevenueCatPurchaseClient()
        self.errorReporter = errorReporter ?? SentryPurchaseErrorReporter()
        self.attemptFactory = attemptFactory
        self.uptime = uptime
        self.canMakePayments = canMakePayments
        self.recordAttempt = recordAttempt
        self.publishSubscription = publishSubscription ?? { customerInfo in
            let identifiers = customerInfo.entitlements.activeInCurrentEnvironment.keys
            let entitlements = Set(identifiers.map { Entitlement(id: $0) })
                .union(Superwall.shared.entitlements.web)
            Superwall.shared.subscriptionStatus = entitlements.isEmpty ? .inactive : .active(entitlements)
        }
    }

    func setPurchasePlacement(_ placement: String?) {
        purchasePlacement = placement
    }

    func setPaywallViewID(_ id: String) { paywallViewID = id }
    func clearPaywallViewID() { paywallViewID = nil }

    func startSyncing() {
        guard syncTasks.isEmpty else { return }
        syncTasks.append(Task { [weak self] in
            for await customerInfo in Purchases.shared.customerInfoStream {
                await self?.apply(customerInfo)
            }
        })
        syncTasks.append(Task { [weak self] in
            for await _ in Superwall.shared.customerInfoStream {
                guard let info = try? await Purchases.shared.customerInfo() else { continue }
                await self?.apply(info)
            }
        })
        syncTasks.append(Task { [weak self] in
            do {
                let info = try await Purchases.shared.customerInfo()
                await self?.apply(info)
            } catch {
                self?.entitlementStore.fail(message: "We couldn't confirm your Pro status. Please try again.")
            }
        })
    }

    func purchase(product: SuperwallKit.StoreProduct) async -> PurchaseResult {
        await performPurchase(productID: product.productIdentifier) {
            guard let sk2Product = product.sk2Product else { throw PurchasingError.storeKitProductMissing }
            return try await self.purchaseClient.purchase(
                product: RevenueCat.StoreProduct(sk2Product: sk2Product)
            )
        }
    }

    // Both the live SDK adapter and controlled rejection tests run this exact state transition.
    func performPurchase(productID: String,
                         operation: () async throws -> RevenueCatPurchaseOutcome) async -> PurchaseResult {
        let placement = purchasePlacement
        let attempt = attemptFactory(productID, placement, paywallViewID, "purchase")
        recordAttempt("purchase_attempt_started", attempt.properties(outcome: "started", uptime: uptime()))
        do {
            let result = try await operation()
            if result.userCancelled {
                recordAttempt("purchase_attempt_finished", attempt.properties(outcome: "cancelled", uptime: uptime()))
                return .cancelled
            }
            entitlementStore.recordNewPurchase(
                productID: productID,
                isTrial: result.customerInfo.entitlements["pro"]?.periodType == .trial
            )
            await apply(result.customerInfo, source: "purchase")
            recordAttempt("purchase_attempt_finished", attempt.properties(outcome: "purchased", uptime: uptime()))
            return .purchased
        } catch {
            let failure = PurchaseFailure.from(error: error, productID: productID)
            let outcome = failure.category == .cancelled ? "cancelled" : failure.category == .pending ? "pending" : "failed"
            let fields = attempt.properties(outcome: outcome, uptime: uptime(), error: error)
            recordAttempt("purchase_attempt_finished", fields)
            switch failure.category {
            case .cancelled:
                return .cancelled
            case .pending:
                return .pending
            case .notAllowed, .productUnavailable, .network, .store, .configuration, .unknown:
                errorReporter.capture(failure: failure, placement: placement, attempt: fields)
                if failure.category == .notAllowed && !canMakePayments() {
                    onPurchaseRestriction?(failure, placement)
                }
                return .failed(failure)
            }
        }
    }

    func restorePurchases() async -> RestorationResult {
        await performRestoration { try await Purchases.shared.restorePurchases() }
    }

    func performRestoration(operation: () async throws -> RevenueCat.CustomerInfo) async -> RestorationResult {
        let placement = purchasePlacement
        let attempt = attemptFactory(nil, placement, paywallViewID, "restore")
        recordAttempt("purchase_attempt_started", attempt.properties(outcome: "started", uptime: uptime()))
        do {
            let info = try await operation()
            await apply(info, source: "restore")
            var fields = attempt.properties(outcome: "restored", uptime: uptime())
            fields["pro_active"] = info.entitlements["pro"]?.isActive == true
            recordAttempt("purchase_attempt_finished", fields)
            return .restored
        } catch {
            let failure = PurchaseFailure.from(error: error, productID: "restore")
            let outcome = failure.category == .cancelled ? "cancelled" : failure.category == .pending ? "pending" : "failed"
            let fields = attempt.properties(outcome: outcome, uptime: uptime(), error: error)
            recordAttempt("purchase_attempt_finished", fields)
            if outcome == "failed" {
                errorReporter.capture(failure: failure, placement: placement, attempt: fields)
            }
            return .failed(error)
        }
    }

    func syncPurchases() async throws -> Bool {
        let info = try await Purchases.shared.syncPurchases()
        await apply(info, source: "offer_code")
        return info.entitlements["pro"]?.isActive == true
    }

    private func apply(_ customerInfo: RevenueCat.CustomerInfo, source: String = "entitlement_sync") async {
        publishSubscription(customerInfo)
        let proEntitlement = customerInfo.entitlements["pro"]
        await notificationCoordinator.updateSubscription(
            SubscriptionReminderState(
                isActive: proEntitlement?.isActive == true,
                isTrial: proEntitlement?.periodType == .trial,
                willRenew: proEntitlement?.willRenew == true,
                unsubscribeDetectedAt: proEntitlement?.unsubscribeDetectedAt,
                expirationDate: proEntitlement?.expirationDate,
                productID: proEntitlement?.productIdentifier
            )
        )
        entitlementStore.update(isPro: proEntitlement?.isActive == true, source: source,
                                isTrial: proEntitlement.map { $0.periodType == .trial })
    }
}
