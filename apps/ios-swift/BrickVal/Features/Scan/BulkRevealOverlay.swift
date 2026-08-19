import SwiftUI

struct BulkRevealOverlay: View {
    let itemCount: Int
    let visibleCount: Int
    let revealedTotal: Double
    let activeEntry: BulkRevealEntry?
    let isHighValue: Bool
    let skip: () -> Void

    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 12) {
            lotValueCard

            if let activeEntry {
                activeMatchCard(activeEntry)
                    .transition(reduceMotion ? .opacity : .opacity.combined(with: .move(edge: .bottom)))
            } else {
                Text("Preparing your lot reveal…")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.white)
            }

            Button("Skip reveal", systemImage: "forward.fill", action: skip)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
                .frame(minHeight: 44)
                .padding(.horizontal, 16)
                .background(.white.opacity(0.14), in: .capsule)
                .overlay { Capsule().stroke(.white.opacity(0.22)) }
                .accessibilityHint("Shows the complete bulk scan review without waiting for the reveal")
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 18)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Lot reveal")
        .accessibilityValue("\(visibleCount) of \(itemCount) figures valued, \(revealedTotal.formatted(.currency(code: "USD")))")
    }

    private var lotValueCard: some View {
        VStack(spacing: 4) {
            HStack {
                Label("Lot value", systemImage: "chart.line.uptrend.xyaxis")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text("\(visibleCount) of \(itemCount) valued")
                    .font(.caption.weight(.semibold).monospacedDigit())
                    .foregroundStyle(.white.opacity(0.62))
            }
            Text(revealedTotal, format: .currency(code: "USD"))
                .font(.system(size: 42, weight: .bold, design: .rounded))
                .foregroundStyle(accent)
                .contentTransition(.numericText())
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.black.opacity(0.78), in: .rect(cornerRadius: 18))
        .overlay { RoundedRectangle(cornerRadius: 18).stroke(.white.opacity(0.16)) }
    }

    private func activeMatchCard(_ entry: BulkRevealEntry) -> some View {
        HStack(spacing: 12) {
            MinifigureThumbnail(
                imageURL: entry.item.result.imageURL,
                identifier: entry.item.result.identifier,
                accent: accent
            )
            .frame(width: 64, height: 64)
            .background(.white, in: .rect(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 3) {
                Text("Match found")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(accent)
                Text(entry.item.result.name)
                    .font(.subheadline.weight(.bold))
                    .lineLimit(2)
                Text(entry.item.result.identifier.uppercased())
                    .font(.caption2.monospaced())
                    .foregroundStyle(.white.opacity(0.62))
                HStack(spacing: 6) {
                    if let value = entry.usedValue {
                        Text("Used sold \(value.formatted(.currency(code: "USD")))")
                            .font(.caption.weight(.semibold))
                    }
                    if let value = entry.newValue {
                        Text("New \(value.formatted(.currency(code: "USD")))")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.white.opacity(0.70))
                    }
                    Text(entry.confidenceTitle)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.62))
                }
                let metadata = [
                    entry.item.result.theme.isEmpty ? nil : entry.item.result.theme,
                    entry.item.result.yearReleased.map(String.init)
                ].compactMap { $0 }.joined(separator: " · ")
                if !metadata.isEmpty {
                    Text(metadata)
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.58))
                }
            }
            .foregroundStyle(.white)

            Spacer(minLength: 0)
        }
        .padding(12)
        .background(.black.opacity(0.84), in: .rect(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16)
                .stroke(isHighValue ? accent : accent.opacity(0.56), lineWidth: isHighValue ? 2.5 : 1)
        }
        .overlay(alignment: .topTrailing) {
            if isHighValue {
                Text("High-value find")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.black)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(accent, in: .capsule)
                    .padding(8)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Match found, \(entry.item.result.name), \(entry.priceSourceTitle), \(entry.usedValue?.formatted(.currency(code: "USD")) ?? "no price"), \(entry.confidenceTitle)")
    }
}
