import CryptoKit
import Foundation
import RevenueCat
import Sentry
import StoreKit

/// A snapshot taken before an explicit purchase or restore. Never holds a receipt or raw customer ID.
struct PurchaseAttempt {
    let id = UUID().uuidString
    private let startedAt: TimeInterval
    private let context: [String: Any]

    init(customerID: String?, productID: String?, placement: String?, operation: String,
         canMakePayments: Bool, storefrontID: String?, storefrontCountry: String?,
         build: String, osVersion: String, uptime: TimeInterval) {
        startedAt = uptime
        var fields: [String: Any] = [
            "operation": operation,
            "purchase_placement": placement ?? "unknown",
            "can_make_payments": canMakePayments,
            "app_build": build,
            "os_version": osVersion,
        ]
        fields["product_id"] = productID
        fields["storefront_id"] = storefrontID
        fields["storefront_country"] = storefrontCountry
        if let customerID, !customerID.isEmpty {
            fields["customer_hash"] = SHA256.hash(data: Data(customerID.utf8))
                .map { String(format: "%02x", $0) }.joined()
        }
        context = fields
    }

    @MainActor
    static func live(productID: String?, placement: String?, operation: String) -> PurchaseAttempt {
        // StoreKit's cached storefront avoids adding a network wait before Apple's purchase sheet.
        let storefront = SKPaymentQueue.default().storefront
        return PurchaseAttempt(
            customerID: Purchases.isConfigured ? Purchases.shared.appUserID : nil,
            productID: productID, placement: placement, operation: operation,
            canMakePayments: AppStore.canMakePayments,
            storefrontID: storefront?.identifier, storefrontCountry: storefront?.countryCode,
            build: Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "unknown",
            osVersion: ProcessInfo.processInfo.operatingSystemVersionString,
            uptime: ProcessInfo.processInfo.systemUptime
        )
    }

    func properties(outcome: String, uptime: TimeInterval, error: Error? = nil) -> [String: Any] {
        var fields = context
        fields["attempt_id"] = id
        fields["outcome"] = outcome
        fields["elapsed_ms"] = max(0, Int((uptime - startedAt) * 1_000))
        if let error {
            // Only domain/code pairs are copied. User info and descriptions may contain private payloads.
            var chain: [[String: Any]] = []
            var current: Error? = error
            var visited: [NSError] = []
            while let original = current, chain.count < 8 {
                let item = original as NSError
                guard !visited.contains(where: { $0 === item }) else { break }
                visited.append(item)
                chain.append(["domain": item.domain, "code": item.code])
                if let root = item.userInfo["rc_root_error"] as? [String: Any],
                   let domain = root["domain"] as? String, let code = root["code"] as? Int,
                   chain.count < 8 {
                    chain.append(["domain": domain, "code": code])
                }
                current = item.userInfo[NSUnderlyingErrorKey] as? NSError
                if let storeKitError = original as? StoreKitError {
                    switch storeKitError {
                    case .systemError(let underlying): current = underlying
                    case .networkError(let underlying): current = underlying
                    default: break
                    }
                }
            }
            fields["error_chain"] = chain
        }
        return fields
    }

    @MainActor
    static func record(event: String, properties: [String: Any], analytics: PostHogAnalytics) {
        analytics.capture(event, properties: properties)
#if !DEBUG
        let breadcrumb = Breadcrumb(level: .info, category: "purchase_attempt")
        breadcrumb.message = event
        breadcrumb.data = properties
        SentrySDK.addBreadcrumb(breadcrumb)
#endif
    }
}
