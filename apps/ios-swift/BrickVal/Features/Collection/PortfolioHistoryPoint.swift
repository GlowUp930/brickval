import Foundation

struct PortfolioHistoryPoint: Identifiable, Sendable {
    let date: String
    let value: Double
    var timestamp: Date? = nil
    var id: String { timestamp.map { String($0.timeIntervalSince1970) } ?? date }
}
