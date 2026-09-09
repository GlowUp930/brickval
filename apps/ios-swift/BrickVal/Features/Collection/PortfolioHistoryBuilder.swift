import Foundation

struct PortfolioMarketHistory: Sendable {
    let points: [PortfolioHistoryPoint]
    let coveredItems: Int
    let totalItems: Int
}

struct MarketSnapshot: Equatable, Sendable {
    let timesSold: Int
    let totalQuantity: Int
    let minimumPriceUSD: Double?
    let averagePriceUSD: Double?
    let quantityAveragePriceUSD: Double?
    let maximumPriceUSD: Double?

    var hasSales: Bool { timesSold > 0 }
}

struct PreparedCollectionHistory: Sendable {
    var portfolios: [PortfolioHorizon: PortfolioMarketHistory] = [:]
    var items: [String: [PortfolioHorizon: [StockChartPoint]]] = [:]
    var snapshots: [String: [PortfolioHorizon: MarketSnapshot]] = [:]
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
        portfolio(items: items, series: items.map { priceSeries(sales: $0.marketSales, horizon: horizon, now: now) })
    }

    /// Called by the store's background preparation task, never during view rendering.
    static func prepare(items: [CollectionItem], now: Date = .now) -> PreparedCollectionHistory {
        var result = PreparedCollectionHistory()
        for item in items {
            guard !Task.isCancelled else { return result }
            let preparedSales = prepareSales(item.marketSales, now: now)
            let observations = dailyObservations(preparedSales)
            result.items[item.id] = Dictionary(uniqueKeysWithValues: PortfolioHorizon.allCases.map {
                ($0, window(observations, horizon: $0, now: now))
            })
            result.snapshots[item.id] = Dictionary(uniqueKeysWithValues: PortfolioHorizon.allCases.map {
                ($0, marketSnapshot(preparedSales, horizon: $0, now: now))
            })
        }
        for item in items {
            let alternate = (item.condition == .used ? DetailConditionOption.new : .used).collectionItem(from: item)
            guard result.items[alternate.id] == nil else { continue }
            let preparedSales = prepareSales(alternate.marketSales, now: now)
            let observations = dailyObservations(preparedSales)
            result.items[alternate.id] = Dictionary(uniqueKeysWithValues: PortfolioHorizon.allCases.map {
                ($0, window(observations, horizon: $0, now: now))
            })
            result.snapshots[alternate.id] = Dictionary(uniqueKeysWithValues: PortfolioHorizon.allCases.map {
                ($0, marketSnapshot(preparedSales, horizon: $0, now: now))
            })
        }
        for horizon in PortfolioHorizon.allCases {
            result.portfolios[horizon] = portfolio(items: items, series: items.map { result.items[$0.id]?[horizon] ?? [] })
        }
        return result
    }

    private static func portfolio(items: [CollectionItem], series: [[StockChartPoint]]) -> PortfolioMarketHistory {
        let covered = zip(items, series).compactMap { item, points -> (CollectionItem, [StockChartPoint])? in
            return points.count > 1 ? (item, points) : nil
        }
        guard let commonStart = covered.compactMap({ $0.1.first?.timestamp }).max() else {
            return PortfolioMarketHistory(points: [], coveredItems: 0, totalItems: items.count)
        }
        // Keep the same holdings throughout the graph; never backfill an item's unknown past.
        let dates = Set(covered.flatMap { $0.1.compactMap(\.timestamp) }).filter { $0 >= commonStart }.sorted()
        var cursors = Array(repeating: 0, count: covered.count)
        let points = dates.map { date in
            let value = covered.indices.reduce(0.0) { total, index in
                let entry = covered[index]
                while cursors[index] + 1 < entry.1.count, entry.1[cursors[index] + 1].timestamp! <= date {
                    cursors[index] += 1
                }
                return total + entry.1[cursors[index]].value * Double(entry.0.quantity)
            }
            return PortfolioHistoryPoint(date: "", value: value, timestamp: date)
        }
        return PortfolioMarketHistory(points: points, coveredItems: covered.count, totalItems: items.count)
    }

    static func priceSeries(sales: [CollectionMarketSale], horizon: PortfolioHorizon, now: Date = .now) -> [StockChartPoint] {
        window(dailyObservations(prepareSales(sales, now: now)), horizon: horizon, now: now)
    }

    static func marketSnapshot(sales: [CollectionMarketSale], horizon: PortfolioHorizon, now: Date = .now) -> MarketSnapshot {
        marketSnapshot(prepareSales(sales, now: now), horizon: horizon, now: now)
    }

    private struct PreparedSale: Sendable {
        let date: Date
        let priceUSD: Double
        let quantity: Int
    }

    private static func prepareSales(_ sales: [CollectionMarketSale], now: Date) -> [PreparedSale] {
        sales.compactMap { sale in
            guard sale.priceUSD.isFinite, sale.priceUSD > 0, sale.quantity > 0,
                  let date = sale.timestamp, date <= now else { return nil }
            return PreparedSale(date: date, priceUSD: sale.priceUSD, quantity: sale.quantity)
        }
    }

    private static func dailyObservations(_ sales: [PreparedSale]) -> [StockChartPoint] {
        var days: [Date: (total: Double, quantity: Int)] = [:]
        for sale in sales {
            let day = calendar.startOfDay(for: sale.date)
            let previous = days[day] ?? (0, 0)
            days[day] = (previous.total + sale.priceUSD * Double(sale.quantity), previous.quantity + sale.quantity)
        }
        return days.keys.sorted().map { date in
            StockChartPoint(label: "", value: days[date]!.total / Double(days[date]!.quantity), timestamp: date)
        }
    }

    private static func marketSnapshot(_ sales: [PreparedSale], horizon: PortfolioHorizon, now: Date) -> MarketSnapshot {
        let start = calendar.date(byAdding: .day, value: -horizon.days, to: calendar.startOfDay(for: now))!
        let windowSales = sales.filter { $0.date >= start && $0.date <= now }
        guard !windowSales.isEmpty else {
            return MarketSnapshot(timesSold: 0, totalQuantity: 0, minimumPriceUSD: nil, averagePriceUSD: nil,
                                  quantityAveragePriceUSD: nil, maximumPriceUSD: nil)
        }
        let totalQuantity = windowSales.reduce(0) { $0 + $1.quantity }
        let total = windowSales.reduce(0.0) { $0 + $1.priceUSD }
        let weightedTotal = windowSales.reduce(0.0) { $0 + ($1.priceUSD * Double($1.quantity)) }
        return MarketSnapshot(
            timesSold: windowSales.count,
            totalQuantity: totalQuantity,
            minimumPriceUSD: windowSales.map(\.priceUSD).min(),
            averagePriceUSD: total / Double(windowSales.count),
            quantityAveragePriceUSD: weightedTotal / Double(totalQuantity),
            maximumPriceUSD: windowSales.map(\.priceUSD).max()
        )
    }

    private static func window(_ observations: [StockChartPoint], horizon: PortfolioHorizon, now: Date) -> [StockChartPoint] {
        let start = calendar.date(byAdding: .day, value: -horizon.days, to: calendar.startOfDay(for: now))!
        var window = observations.filter { $0.timestamp! >= start }
        if let baseline = observations.last(where: { $0.timestamp! < start }), window.first?.timestamp != start {
            window.insert(StockChartPoint(label: "", value: baseline.value, timestamp: start), at: 0)
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

}
