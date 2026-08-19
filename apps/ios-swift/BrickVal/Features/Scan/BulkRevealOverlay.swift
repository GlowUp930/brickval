import SwiftUI

struct BulkSweepTotalPill: View {
    let total: Double
    let valuedCount: Int
    let itemCount: Int
    let accent: Color

    var body: some View {
        HStack(spacing: 8) {
            Text(total, format: .currency(code: "USD"))
                .foregroundStyle(accent)
                .contentTransition(.numericText())
            Text("·")
                .foregroundStyle(.gray)
            Text("\(valuedCount) of \(itemCount) valued")
                .foregroundStyle(.gray)
                .monospacedDigit()
        }
        .font(.headline.weight(.bold))
        .padding(.horizontal, 18)
        .frame(minHeight: 52)
        .background(.white, in: .capsule)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Lot value")
        .accessibilityValue("\(total.formatted(.currency(code: "USD"))), \(valuedCount) of \(itemCount) valued")
    }
}

struct BulkSweepProgress: View {
    let valuedCount: Int
    let itemCount: Int

    var body: some View {
        Text("\(min(valuedCount, itemCount)) of \(itemCount)")
            .font(.caption.weight(.bold).monospacedDigit())
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .frame(minHeight: 34)
            .background(.black.opacity(0.76), in: .capsule)
            .overlay { Capsule().stroke(.white.opacity(0.18)) }
            .accessibilityLabel("Bulk scan progress")
            .accessibilityValue("\(valuedCount) of \(itemCount) figures valued")
    }
}

struct BulkSweepResultCarousel: View {
    let entries: [BulkRevealEntry]
    let revealedCount: Int
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

    private func compactCard(_ entry: BulkRevealEntry) -> some View {
        HStack(spacing: 7) {
            MinifigureThumbnail(
                imageURL: entry.item.result.imageURL,
                identifier: entry.item.result.identifier,
                accent: accent
            )
            .frame(width: 48, height: 58)
            .background(.white, in: .rect(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 2) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.caption.bold())
                    .foregroundStyle(accent)
                Text(entry.item.result.identifier)
                    .font(.caption2.bold())
                    .lineLimit(1)
                if let usedValue = entry.usedValue {
                    Text(usedValue, format: .currency(code: "USD"))
                        .font(.caption.bold().monospacedDigit())
                        .foregroundStyle(accent)
                } else {
                    Text("No price")
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
        .accessibilityLabel("\(entry.item.result.name), \(entry.usedValue?.formatted(.currency(code: "USD")) ?? "no price")")
    }
}

struct BulkRevealOverlay: View {
    let entries: [BulkRevealEntry]
    let visibleCount: Int
    let revealedTotal: Double
    let skip: () -> Void

    @Environment(\.brickValAccent) private var accent

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top) {
                BulkSweepTotalPill(
                    total: revealedTotal,
                    valuedCount: visibleCount,
                    itemCount: entries.count,
                    accent: accent
                )
                Spacer(minLength: 10)
                Button("Skip", systemImage: "forward.fill", action: skip)
                    .labelStyle(.titleAndIcon)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 11)
                    .frame(minHeight: 40)
                    .background(.black.opacity(0.76), in: .capsule)
                    .overlay { Capsule().stroke(.white.opacity(0.18)) }
                    .accessibilityHint("Shows the complete bulk scan review immediately")
            }

            Spacer(minLength: 0)

            VStack(spacing: 8) {
                BulkSweepResultCarousel(
                    entries: entries,
                    revealedCount: visibleCount,
                    accent: accent
                )
                BulkSweepProgress(valuedCount: visibleCount, itemCount: entries.count)
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
