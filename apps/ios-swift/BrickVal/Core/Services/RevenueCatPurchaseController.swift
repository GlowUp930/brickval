import RevenueCat
import StoreKit
import SuperwallKit

@MainActor
final class RevenueCatPurchaseController: PurchaseController {
    private let entitlementStore: EntitlementStore
    private let notificationCoordinator: NotificationCoordinator
    private var syncTasks: [Task<Void, Never>] = []

    init(
        entitlementStore: EntitlementStore,
        notificationCoordinator: NotificationCoordinator
    ) {
        self.entitlementStore = entitlementStore
        self.notificationCoordinator = notificationCoordinator
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
            guard let product = product.sk2Product else { throw PurchasingError.storeKitProductMissing }
            let result = try await Purchases.shared.purchase(product: RevenueCat.StoreProduct(sk2Product: product))
            if result.userCancelled { return .cancelled }
            await apply(result.customerInfo)
            return .purchased
        } catch let error as RevenueCat.ErrorCode where error == .paymentPendingError {
            return .pending
        } catch {
            return .failed(error)
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
                expirationDate: proEntitlement?.expirationDate
            )
        )
        entitlementStore.update(isPro: proEntitlement?.isActive == true)
    }
}
