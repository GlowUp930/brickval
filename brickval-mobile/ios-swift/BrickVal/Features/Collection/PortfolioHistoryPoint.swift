import Foundation

struct PortfolioHistoryPoint: Identifiable {
    let date: String
    let value: Double
    var id: String { date }
}
