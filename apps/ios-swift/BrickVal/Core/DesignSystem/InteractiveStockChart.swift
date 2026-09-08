import Charts
import SwiftUI

struct StockChartPoint: Identifiable, Equatable {
    let label: String
    let value: Double
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
            .chartOverlay { _ in
                Rectangle()
                    .fill(.clear)
                    .contentShape(.rect)
                    .gesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { value in select(at: value.location, width: geometry.size.width) }
                            .onEnded { _ in selectedSampleID = nil }
                    )
            }
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

    private func select(at location: CGPoint, width: CGFloat) {
        guard !samples.isEmpty else { return }
        let relativeX = min(max(location.x, 0), width)
        let progress = width > 0 ? relativeX / width : 0
        let index = min(max(Int((progress * CGFloat(samples.count - 1)).rounded()), 0), samples.count - 1)
        selectedSampleID = samples[index].id
    }

    private static func resample(_ points: [StockChartPoint], count: Int) -> [StockChartSample] {
        guard count > 0 else { return [] }
        guard points.count > 1 else {
            guard let point = points.first else { return [] }
            return [StockChartSample(id: 0, label: point.label, value: point.value)]
        }

        return (0 ..< count).map { outputIndex in
            let position = Double(outputIndex) / Double(count - 1) * Double(points.count - 1)
            let lower = Int(floor(position))
            let upper = min(lower + 1, points.count - 1)
            let fraction = position - Double(lower)
            let value = Self.catmullRomValue(points: points, lower: lower, upper: upper, fraction: fraction)
            let label = points[Int(position.rounded()).clamped(to: 0 ... points.count - 1)].label
            return StockChartSample(id: outputIndex, label: label, value: value)
        }
    }

    private static func catmullRomValue(points: [StockChartPoint], lower: Int, upper: Int, fraction: Double) -> Double {
        let p0 = points[max(lower - 1, 0)].value
        let p1 = points[lower].value
        let p2 = points[upper].value
        let p3 = points[min(upper + 1, points.count - 1)].value
        let t = fraction
        let t2 = t * t
        let t3 = t2 * t
        let smoothed = 0.5 * (
            (2 * p1) +
                (-p0 + p2) * t +
                (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                (-p0 + 3 * p1 - 3 * p2 + p3) * t3
        )
        let localLow = [p0, p1, p2, p3].min() ?? min(p1, p2)
        let localHigh = [p0, p1, p2, p3].max() ?? max(p1, p2)
        let overshoot = max((localHigh - localLow) * 0.08, max(abs(p1), abs(p2)) * 0.002)
        let localBounds = (min(p1, p2) - overshoot) ... (max(p1, p2) + overshoot)
        return smoothed.clamped(to: localBounds)
    }
}

private struct StockChartSample: Identifiable, Equatable {
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
