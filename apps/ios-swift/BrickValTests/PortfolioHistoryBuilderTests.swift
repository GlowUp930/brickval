import Foundation
import Testing
@testable import BrickVal

struct PortfolioHistoryBuilderTests {
    @Test func portfolioHistoryUsesTheSelectedDateWindow() {
        let item = fixture(history: [
            historyPoint(daysAgo: 180, value: 10),
            historyPoint(daysAgo: 90, value: 20),
            historyPoint(daysAgo: 0, value: 30),
        ])

        let month = PortfolioHistoryBuilder.build(items: [item], horizon: .month).map(\.value)
        let quarter = PortfolioHistoryBuilder.build(items: [item], horizon: .quarter).map(\.value)
        let half = PortfolioHistoryBuilder.build(items: [item], horizon: .half).map(\.value)

        #expect(month != quarter)
        #expect(quarter != half)
        #expect(month.first == 30)
        #expect(month.last == 30)
        #expect(quarter.last == 30)
        #expect(half.first == 10)
    }

    @Test func fallbackPriceSeriesStillRespondsToTheSelectedHorizon() {
        let history = [
            MarketHistoryPoint(date: "Jan", priceUSD: 10, source: "test"),
            MarketHistoryPoint(date: "Feb", priceUSD: 20, source: "test"),
            MarketHistoryPoint(date: "Mar", priceUSD: 30, source: "test"),
        ]

        let month = PortfolioHistoryBuilder.priceSeries(from: history, horizon: .month, fallbackValue: 30)
        let half = PortfolioHistoryBuilder.priceSeries(from: history, horizon: .half, fallbackValue: 30)

        #expect(month.map(\.value) != half.map(\.value))
    }

    private func fixture(history: [MarketHistoryPoint]) -> CollectionItem {
        CollectionItem(
            setNumber: "75379",
            itemType: .set,
            name: "R2-D2",
            theme: "Star Wars",
            marketValueUSD: 30,
            quantity: 1,
            marketHistory: history
        )
    }

    private func historyPoint(daysAgo: Int, value: Double) -> MarketHistoryPoint {
        let date = Calendar(identifier: .gregorian).date(byAdding: .day, value: -daysAgo, to: .now) ?? .now
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return MarketHistoryPoint(date: formatter.string(from: date), priceUSD: value, source: "test")
    }
}
