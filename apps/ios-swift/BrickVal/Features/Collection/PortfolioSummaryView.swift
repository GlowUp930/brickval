import SwiftUI

struct PortfolioSummaryView: View {
    let value: Double
    let items: [CollectionItem]
    let horizon: PortfolioHorizon

    private var history: [PortfolioHistoryPoint] {
        PortfolioHistoryBuilder.build(items: items, horizon: horizon)
    }

    private var displayValue: Double { history.last?.value ?? value }
    private var previousValue: Double { history.first?.value ?? displayValue }
    private var change: Double { displayValue - previousValue }
    private var changePercent: Double { previousValue > 0 ? change / previousValue : 0 }
    private var changeSign: String { change >= 0 ? "+" : "−" }
    private var changeColor: Color {
        change >= 0 ? BrickValStyle.Semantic.valuePositive : BrickValStyle.Semantic.valueNegative
    }

    var body: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
            Text("COLLECTION VALUE")
                .font(.system(size: 12, weight: .bold))
                .tracking(0.7)
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
            Text("$\(displayValue, specifier: "%.2f")")
                .font(.system(size: 40, weight: .bold))
                .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                .monospacedDigit()
                .contentTransition(.numericText(value: displayValue))
            HStack(spacing: BrickValStyle.Primitive.space4) {
                Text("\(changeSign)$\(abs(change), specifier: "%.2f")")
                Text("(\(changeSign)\(abs(changePercent) * 100, specifier: "%.2f")%)")
                Text(horizon.summaryLabel)
            }
            .font(.system(size: 16, weight: .medium))
            .foregroundStyle(changeColor)
            .monospacedDigit()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}
