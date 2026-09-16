import Foundation

enum OfferCodeRedemptionState: Equatable, Sendable {
    case idle
    /// The active Superwall paywall is being dismissed before StoreKit is presented.
    case preparing
    case presenting
    case confirming
    case failed(String)
}

@MainActor
protocol OfferCodeRedemptionClient: AnyObject {
    func syncPurchases() async throws -> Bool
}
