import Foundation

enum CollectionStoreError: LocalizedError {
    case freeLimitReached

    var errorDescription: String? {
        switch self {
        case .freeLimitReached:
            "Free collections can hold up to 10 items. Upgrade to Pro for unlimited items."
        }
    }
}
