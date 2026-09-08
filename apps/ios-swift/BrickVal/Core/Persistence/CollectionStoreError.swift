import Foundation

enum CollectionStoreError: LocalizedError {
    case freeLimitReached(limit: Int, used: Int)

    var errorDescription: String? {
        switch self {
        case .freeLimitReached(let limit, _):
            BrickValLocalization.localized("Your free collection can hold \(limit) unique items. Upgrade to BrickValue Pro for unlimited items.")
        }
    }
}
