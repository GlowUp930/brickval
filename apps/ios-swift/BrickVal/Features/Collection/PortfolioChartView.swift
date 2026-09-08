import SwiftUI

struct PortfolioChartView: View {
    @Environment(\.brickValAccent) private var accent
    @Environment(CollectionStore.self) private var store
    let items: [CollectionItem]
    @Binding var horizon: PortfolioHorizon
    var proHorizons: Set<PortfolioHorizon> = []
    var isPro = false
    var onProSelection: (PortfolioHorizon) -> Void = { _ in }

    private var points: [StockChartPoint] {
        PortfolioHistoryBuilder.build(items: items, horizon: horizon).map {
            StockChartPoint(label: $0.date, value: $0.value, timestamp: $0.timestamp)
        }
    }

    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space8) {
            if points.count > 1 {
                Text("Estimated market history").font(.caption).foregroundStyle(.secondary)
                let history = PortfolioHistoryBuilder.marketHistory(items: items, horizon: horizon)
                Text("History available for \(history.coveredItems) of \(history.totalItems) items")
                    .font(.caption2).foregroundStyle(.secondary)
            }
            Group {
                if points.count > 1 {
                    InteractiveStockChart(
                        points: points,
                        lineColor: accent,
                        popupBackground: BrickValStyle.Semantic.textPrimary,
                        popupForeground: BrickValStyle.Semantic.canvas,
                        showsFill: false
                    )
                    .id(horizon)
                    .accessibilityIdentifier("collection.valueChart.\(horizon.rawValue).\(points.count)")
                } else {
                    CollectionHistoryStatusView(hasHistory: false)
                }
            }
            .frame(height: points.count > 1 ? BrickValStyle.CollectionLayout.chartHeight : 80)
            if points.count > 1, store.isRefreshingHistory || store.historyErrorMessage != nil {
                CollectionHistoryStatusView(hasHistory: true)
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
