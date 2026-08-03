import SwiftUI

struct PortfolioChartView: View {
    let items: [CollectionItem]
    @Binding var horizon: PortfolioHorizon

    private var points: [StockChartPoint] {
        PortfolioHistoryBuilder.build(items: items, horizon: horizon).map {
            StockChartPoint(label: $0.date, value: $0.value)
        }
    }

    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space8) {
            Group {
                if points.count > 1 {
                    InteractiveStockChart(
                        points: points,
                        lineColor: BrickValStyle.Semantic.valuePositive,
                        popupBackground: BrickValStyle.Semantic.textPrimary,
                        popupForeground: BrickValStyle.Semantic.canvas,
                        showsFill: false
                    )
                    .id(horizon)
                } else {
                    VStack(spacing: BrickValStyle.Primitive.space8) {
                        Rectangle().fill(BrickValStyle.Semantic.divider).frame(height: 1)
                        Text("Scan an item to start its value history")
                            .font(.system(size: 13))
                            .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                    }
                }
            }
            .frame(height: BrickValStyle.CollectionLayout.chartHeight)

            ChartHorizonPicker(
                selection: $horizon,
                timelinePoints: points,
                tint: BrickValStyle.Semantic.valuePositive,
                inactive: BrickValStyle.Semantic.textSecondary
            )
        }
    }
}
