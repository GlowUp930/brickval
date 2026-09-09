import Foundation
import Sentry

struct AppErrorContext: Sendable {
    let endpoint: String
    let statusCode: Int
    let scanSource: BulkScanSource
    let regionCount: Int
    let appVersion: String
    let appBuild: String
}

@MainActor
protocol AppErrorReporting: AnyObject {
    func capture(error: Error, context: AppErrorContext)
}

@MainActor
final class NoopAppErrorReporter: AppErrorReporting {
    func capture(error: Error, context: AppErrorContext) {}
}

@MainActor
final class SentryAppErrorReporter: AppErrorReporting {
    func capture(error: Error, context: AppErrorContext) {
#if DEBUG
        return
#else
        let scope = Scope()
        scope.setTag(value: "ios", key: "runtime")
        scope.setTag(value: context.endpoint, key: "endpoint")
        scope.setTag(value: context.scanSource.rawValue, key: "scan_source")
        scope.setTag(value: String(context.statusCode), key: "http_status")
        scope.setTag(value: context.appVersion, key: "app_version")
        scope.setTag(value: context.appBuild, key: "app_build")
        scope.setContext(value: [
            "region_count": context.regionCount,
            "release": "com.brickval.app@\(context.appVersion)+\(context.appBuild)",
        ], key: "scan_error")

        if let apiError = error as? APIError {
            var apiContext: [String: Any] = ["status_code": apiError.statusCode]
            if let code = apiError.code { apiContext["code"] = code }
            // Keep the server's English diagnostic separate from the
            // localized customer-facing error description.
            if let serverMessage = apiError.serverMessage {
                apiContext["server_message"] = serverMessage
            }
            scope.setContext(value: apiContext, key: "api_error")
        }

        let nsError = NSError(
            domain: "com.brickval.app.scan",
            code: context.statusCode,
            userInfo: [NSLocalizedDescriptionKey: error.localizedDescription]
        )
        SentrySDK.capture(error: nsError, scope: scope)
#endif
    }
}

@MainActor
protocol PurchaseErrorReporting: AnyObject {
    func capture(failure: PurchaseFailure, placement: String?, attempt: [String: Any])
}

@MainActor
final class NoopPurchaseErrorReporter: PurchaseErrorReporting {
    func capture(failure: PurchaseFailure, placement: String?, attempt: [String: Any]) {}
}

@MainActor
final class SentryPurchaseErrorReporter: PurchaseErrorReporting {
    func capture(failure: PurchaseFailure, placement: String?, attempt: [String: Any]) {
#if DEBUG
        return
#else
        let bundle = Bundle.main
        let build = bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "unknown"
        let scope = Scope()
        scope.setTag(value: failure.productID, key: "purchase_product_id")
        scope.setTag(value: placement ?? "unknown", key: "purchase_placement")
        scope.setTag(value: build, key: "app_build")
        if let id = attempt["attempt_id"] as? String { scope.setTag(value: id, key: "purchase_attempt_id") }
        if let hash = attempt["customer_hash"] as? String { scope.setTag(value: hash, key: "purchase_customer_hash") }
        scope.setContext(value: attempt, key: "purchase_attempt")
        scope.setContext(value: failure.diagnosticProperties.reduce(into: [String: Any]()) { result, item in
            result[item.key] = item.value
        }, key: "purchase_failure")

        let error = NSError(
            domain: "com.brickval.purchase",
            code: failure.revenueCatCode ?? -1,
            userInfo: [NSLocalizedDescriptionKey: failure.errorDescription ?? BrickValLocalization.localized("Purchase failed.")]
        )
        SentrySDK.capture(error: error, scope: scope)
#endif
    }
}
