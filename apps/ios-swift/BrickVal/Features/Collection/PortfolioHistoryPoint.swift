import Foundation

struct PortfolioHistoryPoint: Identifiable {
    let date: String
    let value: Double
    var timestamp: Date? = nil
    var id: String { date }
}
