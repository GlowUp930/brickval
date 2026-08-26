import SwiftUI

struct BulkSweepTotalHUD: View {
    let total: Double
    let pricedCount: Int
    let itemCount: Int
    let accent: Color
    let latestValue: Double?
    let revealKey: String?

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isValueArriving = false
    @State private var visibleAddition: Double?

    var body: some View {
        VStack(spacing: 2) {
            Text("LOT VALUE")
                .font(.caption2.weight(.bold))
                .foregroundStyle(.white.opacity(0.62))
                .tracking(0.8)

            HStack(spacing: 8) {
                Text(total, format: .currency(code: "USD"))
                    .font(.title3.weight(.heavy).monospacedDigit())
                    .foregroundStyle(accent)
                    .contentTransition(.numericText())
                    .frame(minWidth: 112, alignment: .trailing)
                Text("·")
                    .foregroundStyle(.white.opacity(0.46))
                Text("\(pricedCount)/\(itemCount)")
                    .font(.headline.weight(.bold).monospacedDigit())
                    .foregroundStyle(.white.opacity(0.82))
                    .frame(minWidth: 54, alignment: .trailing)
            }

            Text(visibleAddition.map { "+\($0.formatted(.currency(code: "USD")))" } ?? " ")
                .font(.caption.weight(.bold).monospacedDigit())
                .foregroundStyle(accent)
                .frame(height: 16)
                .opacity(visibleAddition == nil ? 0 : 1)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 9)
        .frame(minWidth: 214, minHeight: 68)
        .background(.black.opacity(0.84), in: .capsule)
        .overlay { Capsule().stroke(accent.opacity(isValueArriving ? 0.72 : 0.34), lineWidth: isValueArriving ? 1.5 : 1) }
        .shadow(
            color: accent.opacity(isValueArriving ? 0.34 : 0.12),
            radius: isValueArriving ? 14 : 7,
            y: 3
        )
        .scaleEffect(isValueArriving && !reduceMotion ? 1.035 : 1)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: isValueArriving)
        .task(id: revealKey) {
            guard revealKey != nil, let latestValue else {
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.16)) {
                    visibleAddition = nil
                    isValueArriving = false
                }
                return
            }

            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.16)) {
                visibleAddition = latestValue
                isValueArriving = !reduceMotion
            }

            do {
                try await Task.sleep(for: .milliseconds(reduceMotion ? 220 : 280))
            } catch {
                return
            }
            guard !Task.isCancelled else { return }

            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.22)) {
                visibleAddition = nil
                isValueArriving = false
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("bulkReveal.total")
        .accessibilityLabel("Lot value")
        .accessibilityValue(
            "\(total.formatted(.currency(code: "USD"))), \(pricedCount) of \(itemCount) figures priced"
        )
    }
}

struct BulkSweepProgress: View {
    let checkedCount: Int
    let itemCount: Int

    var body: some View {
        Text("\(min(checkedCount, itemCount)) of \(itemCount)")
            .font(.caption.weight(.bold).monospacedDigit())
            .foregroundStyle(.white.opacity(0.82))
            .padding(.horizontal, 11)
            .frame(minHeight: 30)
            .background(.black.opacity(0.72), in: .capsule)
            .overlay { Capsule().stroke(.white.opacity(0.18)) }
            .accessibilityLabel("Bulk scan progress")
            .accessibilityValue("\(checkedCount) of \(itemCount) figures checked")
    }
}

struct BulkSweepResultCarousel: View {
    let entries: [BulkRevealEntry]
    let revealedCount: Int
    let condition: CollectionCondition
    let accent: Color

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var revealedEntries: [BulkRevealEntry] {
        Array(entries.prefix(revealedCount).suffix(4))
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal) {
                LazyHStack(spacing: 7) {
                    ForEach(revealedEntries) { entry in
                        compactCard(entry)
                            .id(entry.id)
                    }
                }
                .padding(.horizontal, 10)
            }
            .scrollIndicators(.hidden)
            .onChange(of: revealedCount) { _, _ in
                guard let lastID = revealedEntries.last?.id else { return }
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
                    proxy.scrollTo(lastID, anchor: .trailing)
                }
            }
        }
        .frame(height: 68)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Recent valued figures")
    }

    @ViewBuilder
    private func compactCard(_ entry: BulkRevealEntry) -> some View {
        if let item = entry.item {
            HStack(spacing: 6) {
                MinifigureThumbnail(
                    imageURL: item.result.imageURL,
                    identifier: item.result.identifier,
                    accent: accent
                )
                .frame(width: 40, height: 52)
                .background(.white, in: .rect(cornerRadius: 7))

                VStack(alignment: .leading, spacing: 2) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.caption2.bold())
                        .foregroundStyle(accent)
                    Text(item.result.identifier)
                        .font(.caption2.bold())
                        .lineLimit(1)
                    if let displayValue = entry.value(for: condition) {
                        Text(displayValue, format: .currency(code: "USD"))
                            .font(.caption2.bold().monospacedDigit())
                            .foregroundStyle(accent)
                    } else {
                        Text("Price unavailable")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.white.opacity(0.58))
                            .lineLimit(1)
                    }
                }
                .foregroundStyle(.white)
            }
            .padding(5)
            .background(.black.opacity(0.80), in: .rect(cornerRadius: 10))
            .overlay { RoundedRectangle(cornerRadius: 10).stroke(accent.opacity(0.46)) }
            .accessibilityElement(children: .combine)
            .accessibilityLabel(
                "\(item.result.name), \(entry.value(for: condition)?.formatted(.currency(code: "USD")) ?? "Price unavailable")"
            )
        }
    }
}

struct BulkRevealOverlay: View {
    let entries: [BulkRevealEntry]
    let visibleCount: Int
    let revealedTotal: Double
    let currentStatus: String?
    let condition: CollectionCondition
    let stage: BulkRevealVisualStage
    let jackpotTotal: Double
    let topFind: BulkRevealEntry?

    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var animatedJackpotTotal = 0.0

    var body: some View {
        ZStack {
            if stage == .jackpot {
                Color.black.opacity(0.24)
            }

            switch stage {
            case .hook:
                hookContent
            case .sweeping, .waiting:
                sweepContent
            case .jackpot:
                jackpotContent
            case .completed:
                EmptyView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .animation(reduceMotion ? nil : .easeOut(duration: 0.24), value: stage)
        .allowsHitTesting(false)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Bulk lot valuation reveal")
        .onChange(of: stage) { _, newStage in
            guard newStage == .jackpot else {
                animatedJackpotTotal = 0
                return
            }
            guard !reduceMotion else {
                animatedJackpotTotal = jackpotTotal
                return
            }
            animatedJackpotTotal = 0
            withAnimation(.easeOut(duration: 0.90)) {
                animatedJackpotTotal = jackpotTotal
            }
        }
    }

    private var hookContent: some View {
        VStack(spacing: 8) {
            Spacer()
            Text("\(entries.count) figures found")
                .font(.system(size: 34, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
            Text("Finding the value in your lot")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white.opacity(0.70))
            Spacer()
        }
        .padding(.horizontal, 24)
        .safeAreaPadding(.top, 56)
        .safeAreaPadding(.bottom, 80)
    }

    private var sweepContent: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer(minLength: 0)
                BulkSweepTotalHUD(
                    total: revealedTotal,
                    pricedCount: entries.prefix(visibleCount).filter { $0.value(for: condition) != nil }.count,
                    itemCount: entries.count,
                    accent: accent,
                    latestValue: entries.prefix(visibleCount).last?.value(for: condition),
                    revealKey: entries.prefix(visibleCount).last?.id
                )
                Spacer(minLength: 0)
            }

            Spacer(minLength: 0)

            VStack(spacing: 6) {
                if let currentStatus {
                    Text(currentStatus)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.76))
                        .accessibilityLabel(currentStatus)
                }
                BulkSweepResultCarousel(
                    entries: entries,
                    revealedCount: visibleCount,
                    condition: condition,
                    accent: accent
                )
                BulkSweepProgress(
                    checkedCount: visibleCount,
                    itemCount: entries.count
                )
            }
            .padding(.bottom, 12)
        }
        .padding(.horizontal, 12)
        .padding(.top, 14)
        .safeAreaPadding(.top, 10)
        .safeAreaPadding(.bottom, 8)
    }

    private var jackpotContent: some View {
        VStack(spacing: 8) {
            Spacer()
            Text(animatedJackpotTotal, format: .currency(code: "USD"))
                .font(.system(size: 54, weight: .heavy, design: .rounded))
                .foregroundStyle(accent)
                .contentTransition(.numericText())
                .accessibilityIdentifier("bulkReveal.jackpotTotal")
            Text("\(entries.filter { $0.value(for: condition) != nil }.count) figures valued")
                .font(.headline.weight(.semibold))
                .foregroundStyle(.white)
            if let topFind, let topValue = topFind.value(for: condition) {
                Label(
                    "Top find \(topValue.formatted(.currency(code: "USD")))",
                    systemImage: "star.fill"
                )
                .font(.subheadline.weight(.bold).monospacedDigit())
                .foregroundStyle(Color(red: 1.0, green: 0.78, blue: 0.24))
            }
            Spacer()
        }
        .padding(.horizontal, 24)
        .safeAreaPadding(.top, 48)
        .safeAreaPadding(.bottom, 72)
    }
}
