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

        let nsError = NSError(
            domain: "com.brickval.app.scan",
            code: context.statusCode,
            userInfo: [NSLocalizedDescriptionKey: error.localizedDescription]
        )
        SentrySDK.capture(error: nsError, scope: scope)
#endif
    }
}
