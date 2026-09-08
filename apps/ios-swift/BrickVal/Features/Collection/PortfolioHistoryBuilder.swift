import Foundation

struct PortfolioMarketHistory {
    let points: [PortfolioHistoryPoint]
    let coveredItems: Int
    let totalItems: Int
}

enum PortfolioHistoryBuilder {
    private static var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        return calendar
    }

    static func build(items: [CollectionItem], horizon: PortfolioHorizon) -> [PortfolioHistoryPoint] {
        marketHistory(items: items, horizon: horizon).points
    }

    static func marketHistory(items: [CollectionItem], horizon: PortfolioHorizon, now: Date = .now) -> PortfolioMarketHistory {
        let covered = items.compactMap { item -> (CollectionItem, [StockChartPoint])? in
            let points = priceSeries(sales: item.marketSales, horizon: horizon, now: now)
            return points.count > 1 ? (item, points) : nil
        }
        guard let commonStart = covered.compactMap({ $0.1.first?.timestamp }).max() else {
            return PortfolioMarketHistory(points: [], coveredItems: 0, totalItems: items.count)
        }
        // Keep the same holdings throughout the graph; never backfill an item's unknown past.
        let dates = Set(covered.flatMap { $0.1.compactMap(\.timestamp) }).filter { $0 >= commonStart }.sorted()
        let points = dates.map { date in
            let value = covered.reduce(0.0) { total, entry in
                total + (entry.1.last(where: { ($0.timestamp ?? .distantFuture) <= date })?.value ?? 0) * Double(entry.0.quantity)
            }
            return PortfolioHistoryPoint(date: label(date), value: value, timestamp: date)
        }
        return PortfolioMarketHistory(points: points, coveredItems: covered.count, totalItems: items.count)
    }

    static func priceSeries(sales: [CollectionMarketSale], horizon: PortfolioHorizon, now: Date = .now) -> [StockChartPoint] {
        let start = calendar.date(byAdding: .day, value: -horizon.days, to: calendar.startOfDay(for: now))!
        var days: [Date: (total: Double, quantity: Int)] = [:]
        for sale in sales {
            guard sale.priceUSD.isFinite, sale.priceUSD > 0, sale.quantity > 0,
                  let date = sale.timestamp, date <= now else { continue }
            let day = calendar.startOfDay(for: date)
            let previous = days[day] ?? (0, 0)
            days[day] = (previous.total + sale.priceUSD * Double(sale.quantity), previous.quantity + sale.quantity)
        }
        let observations = days.keys.sorted().map { date in
            StockChartPoint(label: label(date), value: days[date]!.total / Double(days[date]!.quantity), timestamp: date)
        }
        var window = observations.filter { $0.timestamp! >= start }
        if let baseline = observations.last(where: { $0.timestamp! < start }), window.first?.timestamp != start {
            window.insert(StockChartPoint(label: label(start), value: baseline.value, timestamp: start), at: 0)
        }
        return window
    }

    // Compatibility for the scan result's separate, optional history payload.
    static func priceSeries(from history: [MarketHistoryPoint], horizon: PortfolioHorizon, fallbackValue: Double) -> [StockChartPoint] {
        let sales = history.map { CollectionMarketSale(date: $0.date.count == 10 ? $0.date + "T00:00:00Z" : $0.date, priceUSD: $0.priceUSD, quantity: 1) }
        let points = priceSeries(sales: sales, horizon: horizon)
        if !points.isEmpty { return points }
        return fallbackValue.isFinite && fallbackValue > 0 ? [StockChartPoint(label: BrickValLocalization.localized("Saved value"), value: fallbackValue)] : []
    }

    private static func label(_ date: Date) -> String {
        date.formatted(.dateTime.month(.abbreviated).day().locale(BrickValLocalization.effectiveLanguage.locale))
    }
}
