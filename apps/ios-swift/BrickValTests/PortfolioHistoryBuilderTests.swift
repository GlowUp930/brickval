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

    @Test func sellerCountryFilteringKeepsMissingRowsInAllRegionsOnly() {
        let sales = [
            sale("2026-09-01", 10, 1, country: "US"),
            sale("2026-09-02", 20, 3, country: "ca"),
            sale("2026-09-03", 40, 1),
        ]
        let canada = MarketRegion.sellerCountry("CA")!
        let us = MarketRegion.sellerCountry("US")!
        let unitedKingdom = MarketRegion.sellerCountry("GB")!

        #expect(PortfolioHistoryBuilder.marketSnapshot(sales: sales, horizon: .month, now: now).timesSold == 3)
        #expect(PortfolioHistoryBuilder.marketSnapshot(sales: sales, horizon: .month, now: now, region: .all).totalQuantity == 5)
        #expect(PortfolioHistoryBuilder.marketSnapshot(sales: sales, horizon: .month, now: now, region: canada).timesSold == 1)
        #expect(PortfolioHistoryBuilder.marketSnapshot(sales: sales, horizon: .month, now: now, region: canada).quantityAveragePriceUSD == 20)
        #expect(PortfolioHistoryBuilder.marketSnapshot(sales: sales, horizon: .month, now: now, region: us).timesSold == 1)
        #expect(PortfolioHistoryBuilder.marketSnapshot(sales: sales, horizon: .month, now: now, region: unitedKingdom).hasSales == false)
        #expect(PortfolioHistoryBuilder.priceSeries(sales: sales, horizon: .month, now: now, region: canada).map(\.value) == [20])
    }

    @Test func activeListingFallbackAppearsInChartAndSnapshotWithoutBeingCalledSold() {
        let listings = [
            sale("2026-09-08", 40, 2, source: "listing"),
            sale("2026-09-08", 60, 1, source: "listing")
        ]
        let points = PortfolioHistoryBuilder.priceSeries(sales: listings, horizon: .month, now: now)
        let snapshot = PortfolioHistoryBuilder.marketSnapshot(sales: listings, horizon: .month, now: now)

        #expect(points.count == 1)
        #expect(points.first?.value == 46.666666666666664)
        #expect(snapshot.source == "listing")
        #expect(snapshot.timesSold == 2)
        #expect(snapshot.totalQuantity == 3)
        #expect(snapshot.averagePriceUSD == 50)
        #expect(snapshot.quantityAveragePriceUSD == 140.0 / 3.0)
    }

    @Test func regionalFilterCanUseListingsWhenThatRegionHasNoSoldRows() {
        let sales = [
            sale("2026-09-08", 100, 1, country: "CA"),
            sale("2026-09-08", 40, 2, country: "US", source: "listing")
        ]
        let us = MarketRegion.sellerCountry("US")!
        let snapshot = PortfolioHistoryBuilder.marketSnapshot(sales: sales, horizon: .month, now: now, region: us)
        #expect(snapshot.source == "listing")
        #expect(snapshot.timesSold == 1)
        #expect(snapshot.quantityAveragePriceUSD == 40)
    }

    @Test func currentListingObservationDoesNotEraseOlderPortfolioSales() {
        var sold = fixture()
        sold.marketSales = [sale("2026-08-15", 10), sale("2026-09-01", 20)]
        var listing = fixture(number: "70919")
        listing.marketSales = [sale("2026-09-08", 40, 1, source: "listing")]

        let history = PortfolioHistoryBuilder.marketHistory(items: [sold, listing], horizon: .month, now: now)
        #expect(history.coveredItems == 2)
        #expect(history.points.count == 3)
        #expect(history.points.first?.value == 10)
        #expect(history.points.last?.value == 60)
    }

    @Test func preparedHistoryContainsEveryObservedSellerCountryWithoutChangingCurrentPortfolio() {
        var item = fixture()
        item.marketSales = [
            sale("2026-09-01", 10, country: "US"), sale("2026-09-02", 12, country: "US"),
            sale("2026-09-03", 30, country: "CA"), sale("2026-09-04", 32, country: "CA"),
        ]
        let prepared = PortfolioHistoryBuilder.prepare(items: [item], now: now)
        let canada = MarketRegion.sellerCountry("CA")!
        let us = MarketRegion.sellerCountry("US")!

        #expect(prepared.items[item.id]?[us]?[.month]?.count == 2)
        #expect(prepared.items[item.id]?[canada]?[.month]?.count == 2)
        #expect(prepared.snapshots[item.id]?[us]?[.month]?.timesSold == 2)
        #expect(prepared.snapshots[item.id]?[canada]?[.month]?.timesSold == 2)
        #expect(prepared.portfolios[.all]?[.month]?.points.last?.value == 32)
        #expect(prepared.portfolios[us]?[.month]?.points.last?.value == 12)
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

    @Test func chartUsesAStableSmoothTurnWithoutInventingExtrema() {
        let points = [
            StockChartPoint(label: "A", value: 0, timestamp: now),
            StockChartPoint(label: "B", value: 10, timestamp: now.addingTimeInterval(86400)),
            StockChartPoint(label: "C", value: 0, timestamp: now.addingTimeInterval(172800)),
        ]

        let samples = InteractiveStockChart.resample(points, count: 9)

        #expect(samples.map(\.id) == Array(0 ..< 9))
        #expect(samples.allSatisfy { (0...10).contains($0.value) })
        #expect(samples[2].value > 5)
        #expect(samples[6].value > 5)
        #expect(samples[4].value == 10)
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

    private func sale(_ date: String, _ price: Double, _ quantity: Int = 1, country: String? = nil, source: String? = nil) -> CollectionMarketSale {
        CollectionMarketSale(date: date + "T00:00:00Z", priceUSD: price, quantity: quantity, sellerCountryCode: country, source: source)
    }
    private func fixture(number: String = "21367") -> CollectionItem {
        CollectionItem(setNumber: number, itemType: .set, name: "Fixture", theme: "LEGO", marketValueUSD: 30)
    }
}
