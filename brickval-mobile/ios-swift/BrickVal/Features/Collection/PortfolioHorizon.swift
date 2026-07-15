import Foundation

enum PortfolioHorizon: String, CaseIterable, Identifiable {
    case month = "1M"
    case quarter = "3M"
    case year = "1Y"
    case all = "All"

    var id: Self { self }

    var pointLimit: Int? {
        switch self {
        case .month: 30
        case .quarter: 90
        case .year: 365
        case .all: nil
        }
    }
}
