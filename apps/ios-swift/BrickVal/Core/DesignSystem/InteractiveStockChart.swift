import Charts
import SwiftUI

struct StockChartPoint: Identifiable, Equatable {
    let label: String
    let value: Double
    var timestamp: Date? = nil
    var id: String { label }
}

struct InteractiveStockChart: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(PreferencesStore.self) private var preferences
    @Environment(CurrencyStore.self) private var currency

    let points: [StockChartPoint]
    let lineColor: Color
    let popupBackground: Color
    let popupForeground: Color
    var showsFill = false

    @State private var selectedSampleID: Int?
    @State private var didReveal = false

    private var samples: [StockChartSample] {
        let requestedCurrency = preferences.effectiveCurrency
        let displayCurrency = currency.displayCurrency(for: requestedCurrency)
        return Self.resample(points, count: 140).map {
            StockChartSample(
                id: $0.id,
                label: $0.label,
                value: currency.converted($0.value, to: displayCurrency)
            )
        }
    }

    private var selectedSample: StockChartSample? {
        guard let selectedSampleID else { return nil }
        return samples.first { $0.id == selectedSampleID }
    }

    private var chartColor: Color {
        lineColor
    }

    private var yDomain: ClosedRange<Double> {
        guard let low = samples.map(\.value).min(), let high = samples.map(\.value).max() else { return 0 ... 1 }
        let padding = max((high - low) * 0.14, max(high * 0.018, 1))
        return max(0, low - padding) ... high + padding
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .topLeading) {
                Chart {
                    if points.count == 1, let sample = samples.first {
                        RuleMark(y: .value("Value", sample.value))
                            .foregroundStyle(chartColor.opacity(0.55))
                            .lineStyle(StrokeStyle(lineWidth: 2, dash: [5, 5]))
                        PointMark(x: .value("Position", 0.5), y: .value("Value", sample.value))
                            .foregroundStyle(chartColor)
                            .symbolSize(64)
                            .annotation(position: .top) {
                                Text("Saved value")
                                    .font(.caption)
                                    .foregroundStyle(chartColor)
                            }
                    }
                    ForEach(samples) { sample in
                        if showsFill {
                            AreaMark(
                                x: .value("Position", sample.id),
                                yStart: .value("Floor", yDomain.lowerBound),
                                yEnd: .value("Value", sample.value)
                            )
                            .interpolationMethod(.monotone)
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [chartColor.opacity(0.10), chartColor.opacity(0)],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )
                        }

                        LineMark(x: .value("Position", sample.id), y: .value("Value", sample.value))
                            .interpolationMethod(.monotone)
                            .foregroundStyle(chartColor)
                            .lineStyle(StrokeStyle(lineWidth: 2.6, lineCap: .round, lineJoin: .round))
                    }

                    if let selectedSample {
                        PointMark(x: .value("Selected position", selectedSample.id), y: .value("Selected value", selectedSample.value))
                            .symbolSize(72)
                            .foregroundStyle(popupBackground)
                    }
                }
                if let selectedSample {
                    scrubberLabel(selectedSample)
                        .position(
                            x: popupX(for: selectedSample, width: geometry.size.width),
                            y: 18
                        )
                }
            }
            .chartXScale(domain: 0 ... max(samples.count - 1, 1))
            .chartYScale(domain: yDomain)
            .chartXAxis(.hidden)
            .chartYAxis(.hidden)
            .chartLegend(.hidden)
            .chartPlotStyle { plot in
                plot
                    .background(.clear)
                    .mask(alignment: .leading) {
                        Rectangle()
                            .frame(width: didReveal || reduceMotion ? geometry.size.width : 0)
                    }
            }
            .chartXSelection(value: $selectedSampleID)
        }
        .animation(reduceMotion ? nil : .spring(response: 0.3, dampingFraction: 0.9, blendDuration: 0.12), value: samples)
        .onAppear {
            guard !didReveal else { return }
            if reduceMotion {
                didReveal = true
            } else {
                withAnimation(.easeOut(duration: 0.74)) {
                    didReveal = true
                }
            }
        }
        .clipped()
        .sensoryFeedback(.selection, trigger: selectedSampleID)
        .accessibilityLabel("Price history chart")
        .accessibilityValue(selectedSample.map {
            let requestedCurrency = preferences.effectiveCurrency
            let displayCurrency = currency.displayCurrency(for: requestedCurrency)
            let amount = $0.value.formatted(
                currency.formatStyle(for: displayCurrency, locale: BrickValLocalization.effectiveLanguage.locale)
            )
            let formatted = "\(amount) · \(displayCurrency.code)"
            return "\($0.label), \(formatted)"
        } ?? BrickValLocalization.localized("Drag across the chart to inspect prices"))
    }

    private func scrubberLabel(_ sample: StockChartSample) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(sample.label).font(.caption2.weight(.semibold)).opacity(0.72)
            BrickValCurrencyText(sample.value, isAlreadyConverted: true)
                .font(.caption.weight(.bold))
                .monospacedDigit()
        }
        .foregroundStyle(popupForeground)
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(popupBackground, in: .rect(cornerRadius: 8))
    }

    private func popupX(for sample: StockChartSample, width: CGFloat) -> CGFloat {
        guard samples.count > 1 else { return width / 2 }
        let progress = CGFloat(sample.id) / CGFloat(samples.count - 1)
        let estimatedHalfWidth: CGFloat = 48
        return (progress * width).clamped(to: estimatedHalfWidth ... max(estimatedHalfWidth, width - estimatedHalfWidth))
    }

    static func resample(_ points: [StockChartPoint], count: Int) -> [StockChartSample] {
        guard count > 0 else { return [] }
        guard points.count > 1 else {
            guard let point = points.first else { return [] }
            return [StockChartSample(id: 0, label: point.label, value: point.value)]
        }

        return (0 ..< count).map { outputIndex in
            let fractionAcross = Double(outputIndex) / Double(max(count - 1, 1))
            var position = fractionAcross * Double(points.count - 1)
            var dateLabel: String?
            if let start = points.first?.timestamp, let end = points.last?.timestamp, end > start,
               points.allSatisfy({ $0.timestamp != nil }) {
                let date = start.addingTimeInterval(end.timeIntervalSince(start) * fractionAcross)
                let lower = points.lastIndex(where: { $0.timestamp! <= date }) ?? 0
                let upper = min(lower + 1, points.count - 1)
                let span = points[upper].timestamp!.timeIntervalSince(points[lower].timestamp!)
                position = Double(lower) + (span > 0 ? date.timeIntervalSince(points[lower].timestamp!) / span : 0)
                dateLabel = date.formatted(.dateTime.month(.abbreviated).day().locale(BrickValLocalization.effectiveLanguage.locale))
            }
            let lower = Int(floor(position))
            let upper = min(lower + 1, points.count - 1)
            let fraction = position - Double(lower)
            let value = points[lower].value + (points[upper].value - points[lower].value) * fraction
            let label = dateLabel ?? points[Int(position.rounded()).clamped(to: 0 ... points.count - 1)].label
            return StockChartSample(id: outputIndex, label: label, value: value)
        }
    }

}

struct StockChartSample: Identifiable, Equatable {
    let id: Int
    let label: String
    let value: Double
}

private extension Comparable {
    func clamped(to range: ClosedRange<Self>) -> Self {
        min(max(self, range.lowerBound), range.upperBound)
    }
}

struct ChartHorizonPicker: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Binding var selection: PortfolioHorizon
    var timelinePoints: [StockChartPoint] = []
    let tint: Color
    let inactive: Color
    var proHorizons: Set<PortfolioHorizon> = []
    var isPro = false
    var onProSelection: (PortfolioHorizon) -> Void = { _ in }

    private var timelineLabels: [String] {
        if let start = timelinePoints.first?.timestamp, let end = timelinePoints.last?.timestamp, end > start {
            return [start, start.addingTimeInterval(end.timeIntervalSince(start) / 2), end].map {
                $0.formatted(.dateTime.month(.abbreviated).day().locale(BrickValLocalization.effectiveLanguage.locale))
            }
        }
        let uniquePoints = timelinePoints.reduce(into: [StockChartPoint]()) { result, point in
            guard result.last?.label != point.label else { return }
            result.append(point)
        }
        guard uniquePoints.count > 1 else { return [] }
        if uniquePoints.count <= 3 { return uniquePoints.map(\.label) }
        return [
            uniquePoints[0].label,
            uniquePoints[(uniquePoints.count - 1) / 2].label,
            uniquePoints[uniquePoints.count - 1].label,
        ]
    }

    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space8) {
            if !timelineLabels.isEmpty {
                HStack {
                    ForEach(timelineLabels, id: \.self) { label in
                        Text(label)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(inactive.opacity(0.82))
                            .monospacedDigit()
                            .frame(maxWidth: .infinity)
                    }
                }
            }

            HStack(spacing: 0) {
                ForEach(PortfolioHorizon.allCases) { option in
                    Button {
                        guard !proHorizons.contains(option) || isPro else {
                            onProSelection(option)
                            return
                        }
                        withAnimation(reduceMotion ? nil : .spring(response: 0.2, dampingFraction: 0.82)) {
                            selection = option
                        }
                    } label: {
                        VStack(spacing: BrickValStyle.Primitive.space4) {
                            HStack(spacing: BrickValStyle.Primitive.space4) {
                                Text(option.rawValue)
                                    .font(.system(size: 13, weight: .semibold))
                                    .monospacedDigit()
                                if proHorizons.contains(option) {
                                    ProBadge(state: isPro ? .active : .requiresPro)
                                        .scaleEffect(0.78)
                                }
                            }
                            Rectangle().fill(selection == option ? tint : .clear).frame(height: 2)
                        }
                        .foregroundStyle(selection == option ? tint : inactive)
                        .frame(maxWidth: .infinity)
                        .frame(height: BrickValStyle.CollectionLayout.timelineHeight)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(
                        proHorizons.contains(option) && !isPro
                            ? BrickValLocalization.localized("Show \(option.rawValue) price history, requires BrickValue Pro")
                            : BrickValLocalization.localized("Show \(option.rawValue) price history")
                    )
                    .accessibilityAddTraits(selection == option ? .isSelected : [])
                }
            }
        }
        .sensoryFeedback(.selection, trigger: selection)
    }
}
