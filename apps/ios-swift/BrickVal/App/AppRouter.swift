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

    init() {
#if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-showCollectionGatingDemo") {
            selectedTab = .collection
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
        guard url.scheme == "brickval" else { return }
        switch url.host {
        case "scan": selectedTab = .scan
        case "collection": selectedTab = .collection
        case "settings":
            selectedTab = .settings
            settingsPath = [.subscription]
        default: break
        }
    }
}
