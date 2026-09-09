import SwiftUI

struct PortfolioSummaryView: View {
    @Environment(\.brickValAccent) private var accent
    @Environment(PreferencesStore.self) private var preferences
    @Environment(CurrencyStore.self) private var currency
    let value: Double
    let history: [PortfolioHistoryPoint]
    let horizon: PortfolioHorizon

    private var displayValue: Double { value }
    private var previousValue: Double { history.first?.value ?? displayValue }
    private var change: Double { (history.last?.value ?? previousValue) - previousValue }
    private var changePercent: Double { previousValue > 0 ? change / previousValue : 0 }
    private var changeSign: String { change >= 0 ? "+" : "−" }
    private var changeColor: Color {
        change >= 0 ? accent : BrickValStyle.Semantic.valueNegative
    }

    var body: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
            HStack(alignment: .firstTextBaseline) {
                Text("COLLECTION VALUE")
                    .font(.system(size: 12, weight: .bold))
                    .tracking(0.7)
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                Spacer(minLength: BrickValStyle.Primitive.space8)
                Text(verbatim: currency.displayCurrency(for: preferences.effectiveCurrency).code)
                    .font(.caption2.weight(.semibold))
                    .tracking(0.35)
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
            }
            BrickValCurrencyText(displayValue)
                .font(.system(size: 40, weight: .bold))
                .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                .monospacedDigit()
                .contentTransition(.numericText(value: displayValue))
            if history.count > 1 {
            Text("Market trend for items with history")
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack(spacing: BrickValStyle.Primitive.space4) {
                Text(changeSign)
                BrickValCurrencyText(abs(change))
                Text("(")
                Text(changeSign)
                Text(abs(changePercent), format: .percent.precision(.fractionLength(2)).locale(BrickValLocalization.effectiveLanguage.locale))
                Text(")")
                Text(horizon.summaryLabel)
            }
            .font(.system(size: 16, weight: .medium))
            .foregroundStyle(changeColor)
            .monospacedDigit()
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}
