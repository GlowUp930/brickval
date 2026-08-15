import Foundation

enum OfferCodeRedemptionState: Equatable, Sendable {
    case idle
    case presenting
    case confirming
    case failed(String)
}

@MainActor
protocol OfferCodeRedemptionClient: AnyObject {
    func syncPurchases() async throws -> Bool
}
