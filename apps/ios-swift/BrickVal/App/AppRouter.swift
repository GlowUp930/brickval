import Foundation
import Observation
import SwiftUI

@Observable
@MainActor
final class AppRouter {
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
        pendingReferralCode = defaults.string(forKey: "brickvalue_pending_referral_code")
#if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-showCollectionGatingDemo") {
            selectedTab = .collection
        } else if ProcessInfo.processInfo.arguments.contains("-showHardPaywallPreviewRootDemo") {
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

    func handle(url: URL) {
        if url.scheme == "brickval" {
            switch url.host {
            case "scan": selectedTab = .scan
            case "collection": selectedTab = .collection
            case "settings":
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
