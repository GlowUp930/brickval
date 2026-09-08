import Foundation

enum PortfolioHistoryBuilder {
    private static let calendar = Calendar(identifier: .gregorian)

    static func build(items: [CollectionItem], horizon: PortfolioHorizon) -> [PortfolioHistoryPoint] {
        guard !items.isEmpty else { return [] }
        let series = items.map { datedHistory($0.marketHistory, horizon: horizon) }
        // A partial portfolio cannot be presented as the historical total.
        guard series.allSatisfy({ !$0.isEmpty }) else { return [] }
        let dates = Set(series.flatMap { $0.map(\.date) }).sorted()
        return dates.compactMap { date in
            var total = 0.0
            for (index, history) in series.enumerated() {
                guard let observation = history.last(where: { $0.date <= date }) else { return nil }
                total += observation.value * Double(items[index].quantity)
            }
            return PortfolioHistoryPoint(date: label(date), value: total)
        }
    }

    static func priceSeries(from history: [MarketHistoryPoint], horizon: PortfolioHorizon, fallbackValue: Double) -> [StockChartPoint] {
        // A current price is not a historical observation. Never invent dates or motion.
        datedHistory(history, horizon: horizon).map { StockChartPoint(label: label($0.date), value: $0.value) }
    }

    private static func datedHistory(_ history: [MarketHistoryPoint], horizon: PortfolioHorizon) -> [(date: Date, value: Double)] {
        let start = calendar.date(byAdding: .day, value: -horizon.days, to: calendar.startOfDay(for: .now)) ?? .now
        return history.compactMap { point -> (date: Date, value: Double)? in
            guard point.priceUSD.isFinite, point.priceUSD > 0,
                  let date = ISO8601DateFormatter().date(from: point.date) ?? historyDateFormatter.date(from: point.date),
                  date >= start, date <= .now else { return nil }
            return (date, point.priceUSD)
        }.sorted { $0.date < $1.date }
    }

    private static func label(_ date: Date) -> String {
        date.formatted(.dateTime.month(.abbreviated).day().locale(BrickValLocalization.effectiveLanguage.locale))
    }

    private static var historyDateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }
}
