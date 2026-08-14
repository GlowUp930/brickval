import Foundation
import Observation

struct NewProPurchase: Equatable, Identifiable, Sendable {
    let productID: String
    let isTrial: Bool

    var id: String { "\(productID):\(isTrial)" }
}

@Observable
@MainActor
final class EntitlementStore {
    private(set) var isPro = false
    private(set) var isLoading = false
    private(set) var shouldPresentProWelcome = false
    private(set) var pendingNewPurchase: NewProPurchase?
    var errorMessage: String?

    @ObservationIgnored private let defaults: UserDefaults

#if DEBUG
    @ObservationIgnored private let forcesProForDemo =
        ProcessInfo.processInfo.arguments.contains("-showProfileTabDemo") ||
        ProcessInfo.processInfo.arguments.contains("-showProGatingDemo") ||
        ProcessInfo.processInfo.arguments.contains("-showProWelcomeDemo")

    @ObservationIgnored private let forcesWelcomeForDemo =
        ProcessInfo.processInfo.arguments.contains("-showProWelcomeDemo")
#endif

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        isPro = defaults.object(forKey: Keys.lastKnownPro) as? Bool ?? false
#if DEBUG
        if forcesProForDemo { isPro = true }
        if forcesWelcomeForDemo { shouldPresentProWelcome = true }
#endif
    }

    func update(isPro: Bool) {
#if DEBUG
        if forcesProForDemo {
            self.isPro = true
            if forcesWelcomeForDemo { shouldPresentProWelcome = true }
            isLoading = false
            errorMessage = nil
            return
        }
#endif
        self.isPro = isPro
        if !isPro {
            shouldPresentProWelcome = false
            pendingNewPurchase = nil
        }
        defaults.set(isPro, forKey: Keys.lastKnownPro)
        isLoading = false
        errorMessage = nil
    }

    func recordNewPurchase(productID: String, isTrial: Bool) {
        pendingNewPurchase = NewProPurchase(productID: productID, isTrial: isTrial)
        shouldPresentProWelcome = true
    }

    func clearPendingNewPurchase() {
        pendingNewPurchase = nil
    }

    func dismissProWelcome() {
        shouldPresentProWelcome = false
    }

    func beginLoading() {
        isLoading = true
        errorMessage = nil
    }

    func fail(message: String) {
        isLoading = false
        errorMessage = message
    }

    private enum Keys {
        static let lastKnownPro = "brickvalue_last_known_pro_status"
    }
}
