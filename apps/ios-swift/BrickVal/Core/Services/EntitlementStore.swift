import Foundation
import Observation

@Observable
@MainActor
final class EntitlementStore {
    private(set) var isPro = false
    private(set) var isLoading = false
    private(set) var shouldPresentProWelcome = false
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
#if DEBUG
        isPro = forcesProForDemo
        shouldPresentProWelcome = forcesWelcomeForDemo
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
        let wasPro = defaults.object(forKey: Keys.lastKnownPro) as? Bool ?? false
        self.isPro = isPro
        if isPro && !wasPro {
            shouldPresentProWelcome = true
        } else if !isPro {
            shouldPresentProWelcome = false
        }
        defaults.set(isPro, forKey: Keys.lastKnownPro)
        isLoading = false
        errorMessage = nil
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
