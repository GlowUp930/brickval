import Foundation
import Testing
@testable import BrickVal

@MainActor
struct HistoryPerformanceTests {
    @Test func measureHistoryPreparation() {
        for count in [10, 50, 200] {
            let items = (0..<count).map { index in
                var item = CollectionItem(setNumber: String(index), itemType: .set, name: "Timing fixture", theme: "LEGO")
                item.marketSales = index.isMultiple(of: 2) ? CollectionHistoryDemo.joker : CollectionHistoryDemo.rocket
                return item
            }
            var durations: [Double] = []
            var checksum = 0.0
            for index in 0..<20 {
                let start = ProcessInfo.processInfo.systemUptime
                let history = PortfolioHistoryBuilder.marketHistory(items: items, horizon: PortfolioHorizon.allCases[index % 3], now: CollectionHistoryDemo.referenceDate)
                checksum += history.points.last?.value ?? 0
                durations.append((ProcessInfo.processInfo.systemUptime - start) * 1000)
            }
            print("HISTORY_BENCH holdings=\(count) single_build_p95_ms=\(durations.sorted()[18]) checksum=\(checksum)")
            #expect(checksum > 0)
            let preparationStart = ProcessInfo.processInfo.systemUptime
            let prepared = PortfolioHistoryBuilder.prepare(items: items, now: CollectionHistoryDemo.referenceDate)
            let preparationMS = (ProcessInfo.processInfo.systemUptime - preparationStart) * 1000
            durations = []
            for index in 0..<20 {
                let start = ProcessInfo.processInfo.systemUptime
                let history = prepared.portfolios[PortfolioHorizon.allCases[index % 3]]!
                let points = history.points.map { StockChartPoint(label: $0.date, value: $0.value, timestamp: $0.timestamp) }
                checksum += InteractiveStockChart.resample(points, count: 140).last?.value ?? 0
                durations.append((ProcessInfo.processInfo.systemUptime - start) * 1000)
            }
            print("HISTORY_PREPARED holdings=\(count) all_windows_ms=\(preparationMS) warm_chart_data_p95_ms=\(durations.sorted()[18]) checksum=\(checksum)")
            #expect(durations.sorted()[18] < 200)
        }
    }
}
