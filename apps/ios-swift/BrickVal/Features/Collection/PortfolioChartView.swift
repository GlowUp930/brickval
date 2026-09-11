import SwiftUI

struct PortfolioChartView: View {
    @Environment(\.brickValAccent) private var accent
    @Environment(CollectionStore.self) private var store
    @Binding var horizon: PortfolioHorizon
    @Binding var region: MarketRegion
    var proHorizons: Set<PortfolioHorizon> = []
    var isPro = false
    var onProSelection: (PortfolioHorizon) -> Void = { _ in }

    private var points: [StockChartPoint] {
        (store.preparedHistory.portfolios[region]?[horizon]?.points ?? []).map {
            StockChartPoint(label: $0.date, value: $0.value, timestamp: $0.timestamp)
        }
    }

    private var availableRegions: [MarketRegion] {
        PortfolioHistoryBuilder.availableRegions(items: store.items)
    }

    private var hasAskingHistory: Bool {
        store.items.contains { item in
            item.marketSales.contains { $0.source == "listing" } &&
            !(store.preparedHistory.items[item.id]?[region]?[horizon] ?? []).isEmpty
        }
    }

    private var canDisplayChart: Bool { points.count > 1 || (hasAskingHistory && !points.isEmpty) }

    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space8) {
            if canDisplayChart {
                let history = store.preparedHistory.portfolios[region]?[horizon] ?? PortfolioMarketHistory(points: [], coveredItems: 0, totalItems: store.items.count)
                Text("History available for \(history.coveredItems) of \(history.totalItems) items")
                    .font(.caption2).foregroundStyle(.secondary)
            }
            Group {
                if canDisplayChart {
                    InteractiveStockChart(
                        points: points,
                        lineColor: accent,
                        popupBackground: BrickValStyle.Semantic.textPrimary,
                        popupForeground: BrickValStyle.Semantic.canvas,
                        showsFill: false,
                        selectionID: "\(region.rawValue)-\(horizon.rawValue)",
                        singlePointLabel: hasAskingHistory ? "Current asking price" : "Saved value"
                    )
                    .accessibilityIdentifier("collection.valueChart.\(horizon.rawValue).\(points.count)")
                } else {
                    CollectionHistoryStatusView(hasHistory: false, region: region, pointCount: points.count)
                }
            }
            .frame(height: canDisplayChart ? BrickValStyle.CollectionLayout.chartHeight : 80)
            if points.count > 1, store.isRefreshingHistory || store.historyErrorMessage != nil {
                CollectionHistoryStatusView(hasHistory: true, region: region, pointCount: points.count)
            }

            HStack {
                Spacer()
                MarketRegionMenu(selection: $region, regions: availableRegions, tint: accent)
            }

            ChartHorizonPicker(
                selection: $horizon,
                timelinePoints: points,
                tint: accent,
                inactive: BrickValStyle.Semantic.textSecondary,
                proHorizons: proHorizons,
                isPro: isPro,
                onProSelection: onProSelection
            )
        }
    }
}
