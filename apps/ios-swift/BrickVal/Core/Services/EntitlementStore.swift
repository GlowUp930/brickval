import Foundation
import Observation

@Observable
@MainActor
final class EntitlementStore {
    private(set) var isPro = false
    private(set) var isLoading = false
    var errorMessage: String?

#if DEBUG
    @ObservationIgnored private let forcesProForDemo =
        ProcessInfo.processInfo.arguments.contains("-showProfileTabDemo") ||
        ProcessInfo.processInfo.arguments.contains("-showProGatingDemo")
#endif

    init() {
#if DEBUG
        isPro = forcesProForDemo
#endif
    }

    func update(isPro: Bool) {
#if DEBUG
        if forcesProForDemo {
            self.isPro = true
            isLoading = false
            errorMessage = nil
            return
        }
#endif
        self.isPro = isPro
        isLoading = false
        errorMessage = nil
    }

    func beginLoading() {
        isLoading = true
        errorMessage = nil
    }

    func fail(message: String) {
        isLoading = false
        errorMessage = message
    }
}
