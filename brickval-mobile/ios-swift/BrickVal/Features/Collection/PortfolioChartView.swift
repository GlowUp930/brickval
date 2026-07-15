import Charts
import SwiftUI

struct PortfolioChartView: View {
    let items: [CollectionItem]
    @State private var horizon: PortfolioHorizon = .quarter

    private var points: [PortfolioHistoryPoint] {
        PortfolioHistoryBuilder.build(items: items, horizon: horizon)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Value history").font(.headline)
                Spacer()
                Picker("History range", selection: $horizon) {
                    ForEach(PortfolioHorizon.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 220)
            }
            if points.isEmpty {
                ContentUnavailableView(
                    "History appears after scanning",
                    systemImage: "chart.line.uptrend.xyaxis",
                    description: Text("Saved market sales will build your portfolio chart.")
                )
                .frame(minHeight: 180)
            } else {
                Chart(points) { point in
                    AreaMark(x: .value("Date", point.date), y: .value("Value", point.value))
                        .foregroundStyle(.tint.opacity(0.16))
                    LineMark(x: .value("Date", point.date), y: .value("Value", point.value))
                        .foregroundStyle(.tint)
                        .interpolationMethod(.catmullRom)
                }
                .chartYAxis { AxisMarks(format: Decimal.FormatStyle.Currency(code: "USD").precision(.fractionLength(0))) }
                .frame(minHeight: 190)
                .accessibilityLabel("Portfolio value history")
                .accessibilityValue("\(points.count) market history points")
            }
        }
        .brickValCard()
    }
}
