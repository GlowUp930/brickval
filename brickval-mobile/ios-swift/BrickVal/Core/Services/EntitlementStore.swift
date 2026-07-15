import Observation

@Observable
@MainActor
final class EntitlementStore {
    private(set) var isPro = false
    private(set) var isLoading = false
    var errorMessage: String?

    func update(isPro: Bool) {
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
