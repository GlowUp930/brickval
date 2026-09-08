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
    private var syncTasks: [Task<Void, Never>] = []
    private(set) var purchasePlacement: String?

    init(
        entitlementStore: EntitlementStore,
        notificationCoordinator: NotificationCoordinator,
        purchaseClient: (any RevenueCatPurchaseClient)? = nil,
        errorReporter: (any PurchaseErrorReporting)? = nil
    ) {
        self.entitlementStore = entitlementStore
        self.notificationCoordinator = notificationCoordinator
        self.purchaseClient = purchaseClient ?? LiveRevenueCatPurchaseClient()
        self.errorReporter = errorReporter ?? SentryPurchaseErrorReporter()
    }

    func setPurchasePlacement(_ placement: String?) {
        purchasePlacement = placement
    }

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
        do {
            let productID = product.productIdentifier
            guard let sk2Product = product.sk2Product else { throw PurchasingError.storeKitProductMissing }
            let result = try await purchaseClient.purchase(
                product: RevenueCat.StoreProduct(sk2Product: sk2Product)
            )
            if result.userCancelled { return .cancelled }
            await apply(result.customerInfo)
            entitlementStore.recordNewPurchase(
                productID: productID,
                isTrial: result.customerInfo.entitlements["pro"]?.periodType == .trial
            )
            return .purchased
        } catch {
            let failure = PurchaseFailure.from(error: error, productID: product.productIdentifier)
            switch failure.category {
            case .cancelled:
                return .cancelled
            case .pending:
                return .pending
            case .notAllowed, .productUnavailable, .network, .store, .configuration, .unknown:
                errorReporter.capture(failure: failure, placement: purchasePlacement)
                return .failed(failure)
            }
        }
    }

    func restorePurchases() async -> RestorationResult {
        do {
            let info = try await Purchases.shared.restorePurchases()
            await apply(info)
            return .restored
        } catch {
            return .failed(error)
        }
    }

    func syncPurchases() async throws -> Bool {
        let info = try await Purchases.shared.syncPurchases()
        await apply(info)
        return info.entitlements["pro"]?.isActive == true
    }

    private func apply(_ customerInfo: RevenueCat.CustomerInfo) async {
        let identifiers = customerInfo.entitlements.activeInCurrentEnvironment.keys
        let entitlements = Set(identifiers.map { Entitlement(id: $0) })
            .union(Superwall.shared.entitlements.web)
        Superwall.shared.subscriptionStatus = entitlements.isEmpty ? .inactive : .active(entitlements)
        let proEntitlement = customerInfo.entitlements["pro"]
        await notificationCoordinator.updateSubscription(
            SubscriptionReminderState(
                isActive: proEntitlement?.isActive == true,
                isTrial: proEntitlement?.periodType == .trial,
                willRenew: proEntitlement?.willRenew == true,
                expirationDate: proEntitlement?.expirationDate,
                productID: proEntitlement?.productIdentifier
            )
        )
        entitlementStore.update(isPro: proEntitlement?.isActive == true)
    }
}
