import Foundation
import Observation
import SwiftUI

@Observable
@MainActor
final class AppRouter {
    private(set) var notificationNavigationRevision = 0
    private(set) var notificationScanIntent: ScanIntent?
    @ObservationIgnored private var pendingOnboardingScanURL: URL?
    var selectedTab: AppTab = .scan
    var collectionPath: [AppRoute] = []
    var scanPath: [AppRoute] = []
    var settingsPath: [AppRoute] = []
    @ObservationIgnored private let defaults: UserDefaults
    var pendingReferralCode: String? {
        didSet { defaults.set(pendingReferralCode, forKey: "brickvalue_pending_referral_code") }
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        pendingOnboardingScanURL = defaults.url(forKey: "brickvalue_pending_notification_scan")
        pendingReferralCode = defaults.string(forKey: "brickvalue_pending_referral_code")
#if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-showCollectionGatingDemo") || ProcessInfo.processInfo.arguments.contains("-showCollectionHistoryDemo") {
            selectedTab = .collection
        } else if ProcessInfo.processInfo.arguments.contains("-showSettingsRootDemo") {
            selectedTab = .settings
        }
#endif
    }

    func navigate(to route: AppRoute, in tab: AppTab? = nil) {
        switch tab ?? selectedTab {
        case .collection: collectionPath.append(route)
        case .scan: scanPath.append(route)
        case .settings: settingsPath.append(route)
        }
    }

    func handleNotification(url: URL, onboardingCompleted: Bool = true) {
        guard url.scheme == "brickval", ["scan", "collection", "settings", "subscription"].contains(url.host ?? "") else { return }
        if url.host == "scan", !onboardingCompleted {
            pendingOnboardingScanURL = url
            defaults.set(url, forKey: "brickvalue_pending_notification_scan")
            return
        }
        handle(url: url)
        notificationNavigationRevision += 1
    }

    func consumeNotificationScanIntent() -> ScanIntent? {
        defer { notificationScanIntent = nil }
        return notificationScanIntent
    }

    func completeNotificationOnboarding() {
        guard let url = pendingOnboardingScanURL else { return }
        pendingOnboardingScanURL = nil
        defaults.removeObject(forKey: "brickvalue_pending_notification_scan")
        handleNotification(url: url)
    }

    func handle(url: URL) {
        if url.scheme == "brickval" {
            switch url.host {
            case "scan":
                let mode = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "mode" })?.value
                notificationScanIntent = mode == "bulk" ? .bulk : .single
                selectedTab = .scan
                scanPath = []
            case "collection":
                selectedTab = .collection
                collectionPath = []
            case "settings", "subscription":
                selectedTab = .settings
                settingsPath = [.subscription]
            case "referral":
                guard url.pathComponents.count == 2 else { return }
                let code = url.pathComponents[1].uppercased()
                guard code.range(of: "^[A-Z0-9]{8}$", options: .regularExpression) != nil else { return }
                pendingReferralCode = code
                selectedTab = .settings
                settingsPath = [.referral]
            default: break
            }
            return
        }

        guard url.scheme == "https",
              (url.host == "brickvalue.live" || url.host == "www.brickvalue.live"),
              url.pathComponents.count == 3,
              url.pathComponents[1] == "r"
        else { return }

        let code = url.pathComponents[2].uppercased()
        guard code.range(of: "^[A-Z0-9]{8}$", options: .regularExpression) != nil else { return }
        pendingReferralCode = code
        selectedTab = .settings
        settingsPath = [.referral]
    }

    func clearPendingReferral() {
        pendingReferralCode = nil
    }
}
