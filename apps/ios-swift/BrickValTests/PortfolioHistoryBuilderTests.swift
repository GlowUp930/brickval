import Foundation
import Testing
@testable import BrickVal

@MainActor
struct PortfolioHistoryBuilderTests {
    private let now = CollectionHistoryDemo.referenceDate

    @Test func capturedJokerAndRocketSalesProduceDistinctTimeframes() {
        var rocket = fixture()
        rocket.marketSales = CollectionHistoryDemo.rocket
        var joker = fixture(number: "70919")
        joker.marketSales = CollectionHistoryDemo.joker
        let windows = PortfolioHorizon.allCases.map {
            PortfolioHistoryBuilder.marketHistory(items: [rocket, joker], horizon: $0, now: now)
        }
        #expect(windows.allSatisfy { $0.points.count > 2 && $0.coveredItems == 2 })
        #expect(windows[0].points.count < windows[1].points.count)
        #expect(windows[1].points.count < windows[2].points.count)
        #expect(Set(windows[0].points.map(\.value)).count > 1)
    }

    @Test func dailyAverageWeightsSoldQuantityAndRejectsInvalidSales() {
        let sales = [sale("2026-09-01", 10, 1), sale("2026-09-01", 20, 3), sale("2026-09-02", 30, 1),
                     sale("2026-09-02", 999, 0), sale("2026-09-09", 999, 1)]
        let values = PortfolioHistoryBuilder.priceSeries(sales: sales, horizon: .month, now: now).map(\.value)
        #expect(values == [17.5, 30])
    }

    @Test func marketSnapshotCountsRowsAndWeightsQuantitiesSeparately() {
        let sales = [
            sale("2026-09-08", 10, 1),
            sale("2026-09-07", 20, 3),
            sale("2026-08-15", 40, 2),
            sale("2026-09-09", 999, 0),
            sale("bad", 100, 1),
            sale("2026-09-10", 500, 1)
        ]

        let snapshot = PortfolioHistoryBuilder.marketSnapshot(sales: sales, horizon: .month, now: now)

        #expect(snapshot.timesSold == 3)
        #expect(snapshot.totalQuantity == 6)
        #expect(snapshot.minimumPriceUSD == 10)
        #expect(snapshot.averagePriceUSD == 70.0 / 3.0)
        #expect(snapshot.quantityAveragePriceUSD == 150.0 / 6.0)
        #expect(snapshot.maximumPriceUSD == 40)
    }

    @Test func marketSnapshotUsesInclusiveWindowBoundaryAndEmptyPeriods() {
        let boundary = sale("2026-08-09", 25)
        let outside = sale("2026-08-08", 30)

        let inWindow = PortfolioHistoryBuilder.marketSnapshot(sales: [boundary, outside], horizon: .month, now: now)
        let empty = PortfolioHistoryBuilder.marketSnapshot(sales: [outside], horizon: .month, now: now)

        #expect(inWindow.timesSold == 1)
        #expect(inWindow.averagePriceUSD == 25)
        #expect(empty.timesSold == 0)
        #expect(empty.totalQuantity == 0)
        #expect(empty.averagePriceUSD == nil)
        #expect(!empty.hasSales)
    }

    @Test func missingHistoryDoesNotHideCoveredItemsOrInventOldPrices() {
        var first = fixture(); first.quantity = 2
        first.marketSales = [sale("2026-08-15", 10), sale("2026-09-01", 20)]
        var later = fixture(number: "70919")
        later.marketSales = [sale("2026-08-20", 5), sale("2026-09-02", 8)]
        let result = PortfolioHistoryBuilder.marketHistory(items: [first, later, fixture(number: "unknown")], horizon: .month, now: now)
        #expect(result.coveredItems == 2 && result.totalItems == 3)
        #expect(result.points.first?.timestamp == sale("2026-08-20", 1).timestamp)
        #expect(result.points.map(\.value) == [25, 45, 48])
    }

    @Test func recordedScanPricesAreNotMarketSales() {
        let item = fixture()
        #expect(!item.recordedHistory.isEmpty)
        #expect(PortfolioHistoryBuilder.build(items: [item], horizon: .month).isEmpty)
    }

    @Test func chartUsesActualDateSpacingAndNeverOvershoots() {
        let points = [StockChartPoint(label: "A", value: 10, timestamp: now),
                      StockChartPoint(label: "B", value: 30, timestamp: now.addingTimeInterval(86400)),
                      StockChartPoint(label: "C", value: 20, timestamp: now.addingTimeInterval(864000))]
        let samples = InteractiveStockChart.resample(points, count: 11)
        #expect(samples[1].value == 30)
        #expect(samples.allSatisfy { (10...30).contains($0.value) })
    }

    @Test func chartSamplesKeepTheirIdentityAcrossHorizonValues() {
        let firstPoints = [
            StockChartPoint(label: "A", value: 10, timestamp: now),
            StockChartPoint(label: "B", value: 30, timestamp: now.addingTimeInterval(86400)),
        ]
        let secondPoints = [
            StockChartPoint(label: "A", value: 12, timestamp: now),
            StockChartPoint(label: "B", value: 26, timestamp: now.addingTimeInterval(86400)),
        ]
        let first = InteractiveStockChart.resample(firstPoints, count: 140)
        let second = InteractiveStockChart.resample(secondPoints, count: 140)

        #expect(first.map(\.id) == second.map(\.id))
        #expect(first.map(\.id) == Array(0 ..< 140))
        #expect(first.map(\.value) != second.map(\.value))
    }

    private func sale(_ date: String, _ price: Double, _ quantity: Int = 1) -> CollectionMarketSale {
        CollectionMarketSale(date: date + "T00:00:00Z", priceUSD: price, quantity: quantity)
    }
    private func fixture(number: String = "21367") -> CollectionItem {
        CollectionItem(setNumber: number, itemType: .set, name: "Fixture", theme: "LEGO", marketValueUSD: 30)
    }
}
