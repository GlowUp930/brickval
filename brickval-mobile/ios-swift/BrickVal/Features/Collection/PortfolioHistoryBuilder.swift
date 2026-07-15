import Foundation

enum PortfolioHistoryBuilder {
    static func build(items: [CollectionItem], horizon: PortfolioHorizon) -> [PortfolioHistoryPoint] {
        var valuesByDate: [String: Double] = [:]
        for item in items {
            for point in item.marketHistory {
                valuesByDate[point.date, default: 0] += point.priceUSD * Double(item.quantity)
            }
        }
        let points = valuesByDate.keys.sorted().map {
            PortfolioHistoryPoint(date: $0, value: valuesByDate[$0, default: 0])
        }
        guard let limit = horizon.pointLimit else { return points }
        return Array(points.suffix(limit))
    }
}
