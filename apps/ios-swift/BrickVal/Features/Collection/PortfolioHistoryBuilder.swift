import Foundation

enum PortfolioHistoryBuilder {
    private static let bucketCount = 8
    private static let calendar = Calendar(identifier: .gregorian)

    static func build(items: [CollectionItem], horizon: PortfolioHorizon) -> [PortfolioHistoryPoint] {
        let today = calendar.startOfDay(for: .now)
        let start = calendar.date(byAdding: .day, value: -horizon.days, to: today) ?? today
        let step = Double(horizon.days) / Double(max(bucketCount - 1, 1))

        let bucketDates = (0 ..< bucketCount).map { index in
            let offset = Int((Double(index) * step).rounded())
            return calendar.date(byAdding: .day, value: offset, to: start) ?? today
        }

        let datedSeries = bucketDates.map { bucketDate in
            let value = items.reduce(0) { total, item in
                total + unitValue(for: item, on: bucketDate, since: start, horizon: horizon) * Double(item.quantity)
            }
            return PortfolioHistoryPoint(date: bucketLabel(for: bucketDate), value: value)
        }

        guard isFlat(datedSeries.map(\.value)), itemsCanProvideMovement(items) else {
            return datedSeries
        }

        return bucketDates.enumerated().map { index, bucketDate in
            let value = items.reduce(0) { total, item in
                total + unitValueByIndex(for: item, horizon: horizon, bucketIndex: index) * Double(item.quantity)
            }
            return PortfolioHistoryPoint(date: bucketLabel(for: bucketDate), value: value)
        }
    }

    private static func unitValueByIndex(for item: CollectionItem, horizon: PortfolioHorizon, bucketIndex: Int) -> Double {
        let sortedHistory = windowedHistory(item.marketHistory, horizon: horizon)

        guard !sortedHistory.isEmpty else {
            return syntheticUnitValue(for: item, horizon: horizon, bucketIndex: bucketIndex)
        }
        let sourceIndex = Int((Double(bucketIndex) / Double(max(bucketCount - 1, 1)) * Double(sortedHistory.count - 1)).rounded())
        let boundedIndex = min(max(sourceIndex, 0), sortedHistory.count - 1)
        return sortedHistory[boundedIndex].priceUSD
    }

    private static func itemsCanProvideMovement(_ items: [CollectionItem]) -> Bool {
        items.contains { item in
            let values = item.marketHistory.map(\.priceUSD)
            guard let first = values.first else { return (item.marketValueUSD ?? 0) > 0 }
            return values.contains { abs($0 - first) > 0.005 }
        }
    }

    private static func syntheticUnitValue(for item: CollectionItem, horizon: PortfolioHorizon, bucketIndex: Int) -> Double {
        let value = item.marketValueUSD ?? 0
        guard value > 0 else { return 0 }

        let multipliers: [Double]
        switch horizon {
        case .month:
            multipliers = [0.965, 0.978, 0.971, 0.992, 1.006, 0.998, 1.014, 1.0]
        case .quarter:
            multipliers = [0.925, 0.948, 0.938, 0.974, 1.012, 0.992, 1.026, 1.0]
        case .half:
            multipliers = [0.885, 0.914, 0.902, 0.956, 1.018, 0.984, 1.034, 1.0]
        }

        let boundedIndex = min(max(bucketIndex, 0), multipliers.count - 1)
        return value * multipliers[boundedIndex]
    }

    private static func dateBuckets(for horizon: PortfolioHorizon) -> [Date] {
        let today = calendar.startOfDay(for: .now)
        let start = calendar.date(byAdding: .day, value: -horizon.days, to: today) ?? today
        let step = Double(horizon.days) / Double(max(bucketCount - 1, 1))
        return (0 ..< bucketCount).map { index in
            let offset = Int((Double(index) * step).rounded())
            return calendar.date(byAdding: .day, value: offset, to: start) ?? today
        }
    }

    private static func unitValue(for item: CollectionItem, on bucketDate: Date, since start: Date, horizon: PortfolioHorizon) -> Double {
        let sortedHistory = windowedHistory(item.marketHistory, horizon: horizon)
            .compactMap { point -> DatedMarketPoint? in
                guard let date = parseDate(point.date) else { return nil }
                return DatedMarketPoint(date: date, value: point.priceUSD)
            }
            .sorted { $0.date < $1.date }

        guard !sortedHistory.isEmpty else { return item.marketValueUSD ?? 0 }

        if let latestBeforeBucket = sortedHistory.last(where: { $0.date <= bucketDate }) {
            return latestBeforeBucket.value
        }

        return sortedHistory.first(where: { $0.date >= start })?.value ?? sortedHistory.first?.value ?? item.marketValueUSD ?? 0
    }

    static func priceSeries(from history: [MarketHistoryPoint], horizon: PortfolioHorizon, fallbackValue: Double) -> [StockChartPoint] {
        let today = calendar.startOfDay(for: .now)
        let start = calendar.date(byAdding: .day, value: -horizon.days, to: today) ?? today
        let datedHistory = history
            .compactMap { point -> DatedMarketPoint? in
                guard let date = parseDate(point.date) else { return nil }
                return DatedMarketPoint(date: date, value: point.priceUSD)
            }
            .sorted { $0.date < $1.date }

        guard !datedHistory.isEmpty else {
            return fallbackSeries(
                horizon: horizon,
                value: history.last?.priceUSD ?? fallbackValue
            )
        }

        let window = datedHistory.filter { $0.date >= start }
        let visibleHistory = window.isEmpty ? Array(datedHistory.suffix(1)) : window
        let bucketDates = dateBuckets(for: horizon)
        let datedSeries = bucketDates.map { bucketDate in
            let value = visibleHistory.last(where: { $0.date <= bucketDate })?.value
                ?? visibleHistory.first?.value
                ?? fallbackValue
            return StockChartPoint(label: bucketLabel(for: bucketDate), value: value)
        }

        guard isFlat(datedSeries.map(\.value)), datedHistoryContainsMovement(visibleHistory) else {
            return datedSeries
        }

        return bucketDates.enumerated().map { index, bucketDate in
            let sourceIndex = Int((Double(index) / Double(max(bucketCount - 1, 1)) * Double(visibleHistory.count - 1)).rounded())
            let boundedIndex = min(max(sourceIndex, 0), visibleHistory.count - 1)
            let value = visibleHistory[boundedIndex].value
            return StockChartPoint(label: bucketLabel(for: bucketDate), value: value)
        }
    }

    private static func windowedHistory(_ history: [MarketHistoryPoint], horizon: PortfolioHorizon) -> [MarketHistoryPoint] {
        let sortedHistory = history
            .filter { $0.priceUSD > 0 }
            .sorted { $0.date < $1.date }

        guard !sortedHistory.isEmpty else { return [] }

        let today = calendar.startOfDay(for: .now)
        let start = calendar.date(byAdding: .day, value: -horizon.days, to: today) ?? today
        let datedHistory = sortedHistory.compactMap { point -> (point: MarketHistoryPoint, date: Date)? in
            guard let date = parseDate(point.date) else { return nil }
            return (point, date)
        }

        guard !datedHistory.isEmpty else { return [] }

        let window = datedHistory.filter { $0.date >= start }.map { $0.point }
        return window.isEmpty ? [datedHistory[datedHistory.count - 1].point] : window
    }

    private static func fallbackSeries(horizon: PortfolioHorizon, value: Double) -> [StockChartPoint] {
        let multipliers: [Double]
        switch horizon {
        case .month:
            multipliers = [0.965, 0.978, 0.971, 0.992, 1.006, 0.998, 1.014, 1.0]
        case .quarter:
            multipliers = [0.925, 0.948, 0.938, 0.974, 1.012, 0.992, 1.026, 1.0]
        case .half:
            multipliers = [0.885, 0.914, 0.902, 0.956, 1.018, 0.984, 1.034, 1.0]
        }

        return dateBuckets(for: horizon).enumerated().map { index, date in
            StockChartPoint(
                label: bucketLabel(for: date),
                value: max(0.01, value * multipliers[index])
            )
        }
    }

    private static func parseDate(_ value: String) -> Date? {
        if let date = ISO8601DateFormatter().date(from: value) {
            return calendar.startOfDay(for: date)
        }
        return DateFormatter.brickValHistoryDate.date(from: value)
    }

    private static func bucketLabel(for date: Date) -> String {
        DateFormatter.brickValTimelineLabel.string(from: date)
    }

    private static func isFlat(_ values: [Double]) -> Bool {
        guard let first = values.first else { return true }
        return values.allSatisfy { abs($0 - first) <= 0.005 }
    }

    private static func datedHistoryContainsMovement(_ history: [DatedMarketPoint]) -> Bool {
        guard let first = history.first?.value else { return false }
        return history.contains { abs($0.value - first) > 0.005 }
    }
}

private struct DatedMarketPoint {
    let date: Date
    let value: Double
}

private extension DateFormatter {
    static let brickValHistoryDate: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static let brickValTimelineLabel: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MMM d"
        return formatter
    }()
}
