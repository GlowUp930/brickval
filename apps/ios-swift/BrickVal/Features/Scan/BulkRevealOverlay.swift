import SwiftUI

struct BulkSweepTotalPill: View {
    let total: Double
    let pricedCount: Int
    let itemCount: Int
    let accent: Color

    var body: some View {
        HStack(spacing: 8) {
            Text(total, format: .currency(code: "USD"))
                .foregroundStyle(accent)
                .contentTransition(.numericText())
            Text("·")
                .foregroundStyle(.gray)
            Text("\(pricedCount) of \(itemCount) priced")
                .foregroundStyle(.gray)
                .monospacedDigit()
        }
        .font(.headline.weight(.bold))
        .padding(.horizontal, 18)
        .frame(minHeight: 52)
        .background(.white, in: .capsule)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("bulkReveal.total")
        .accessibilityLabel("Lot value")
        .accessibilityValue("\(total.formatted(.currency(code: "USD"))), \(pricedCount) of \(itemCount) priced")
    }
}

struct BulkSweepProgress: View {
    let checkedCount: Int
    let itemCount: Int

    var body: some View {
        Text("\(min(checkedCount, itemCount)) of \(itemCount)")
            .font(.caption.weight(.bold).monospacedDigit())
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .frame(minHeight: 34)
            .background(.black.opacity(0.76), in: .capsule)
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
        Array(entries.prefix(revealedCount))
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal) {
                LazyHStack(spacing: 8) {
                    ForEach(revealedEntries) { entry in
                        compactCard(entry)
                            .id(entry.id)
                    }
                }
                .padding(.horizontal, 12)
            }
            .scrollIndicators(.hidden)
            .onChange(of: revealedCount) { _, _ in
                guard let lastID = revealedEntries.last?.id else { return }
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
                    proxy.scrollTo(lastID, anchor: .trailing)
                }
            }
        }
        .frame(height: 86)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Valued figures")
    }

    @ViewBuilder
    private func compactCard(_ entry: BulkRevealEntry) -> some View {
        if let item = entry.item {
            HStack(spacing: 7) {
                MinifigureThumbnail(
                    imageURL: item.result.imageURL,
                    identifier: item.result.identifier,
                    accent: accent
                )
                .frame(width: 48, height: 58)
                .background(.white, in: .rect(cornerRadius: 8))

                VStack(alignment: .leading, spacing: 2) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.caption.bold())
                        .foregroundStyle(accent)
                    Text(item.result.identifier)
                        .font(.caption2.bold())
                        .lineLimit(1)
                    if let displayValue = entry.value(for: condition) {
                        Text(displayValue, format: .currency(code: "USD"))
                            .font(.caption.bold().monospacedDigit())
                            .foregroundStyle(accent)
                    } else {
                        Text("Price unavailable")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.white.opacity(0.58))
                    }
                }
                .foregroundStyle(.white)
            }
            .padding(6)
            .background(.black.opacity(0.78), in: .rect(cornerRadius: 11))
            .overlay { RoundedRectangle(cornerRadius: 11).stroke(accent.opacity(0.52)) }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("\(item.result.name), \(entry.value(for: condition)?.formatted(.currency(code: "USD")) ?? "Price unavailable")")
        }
    }
}

struct BulkRevealOverlay: View {
    let entries: [BulkRevealEntry]
    let visibleCount: Int
    let revealedTotal: Double
    let currentStatus: String?
    let condition: CollectionCondition

    @Environment(\.brickValAccent) private var accent

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top) {
                BulkSweepTotalPill(
                    total: revealedTotal,
                    pricedCount: entries.prefix(visibleCount).filter { $0.value(for: condition) != nil }.count,
                    itemCount: entries.count,
                    accent: accent
                )
                Spacer(minLength: 10)
            }

            Spacer(minLength: 0)

            VStack(spacing: 8) {
                if let currentStatus {
                    Text(currentStatus)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.72))
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
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Bulk lot valuation sweep")
    }
}
