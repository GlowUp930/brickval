import SwiftUI

struct BulkRevealOverlay: View {
    let itemCount: Int
    let visibleCount: Int
    let revealedTotal: Double
    let skip: () -> Void

    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var accessibilitySummary: String {
        "\(visibleCount) of \(itemCount) figures, \(revealedTotal.formatted(.currency(code: "USD")))"
    }

    var body: some View {
        VStack(spacing: 14) {
            Text(visibleCount == 0 ? "Finding your minifigures" : "Your scan is adding up")
                .font(.headline.weight(.semibold))
                .foregroundStyle(.white)

            Text("Estimated value")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.white.opacity(0.62))

            Text(revealedTotal, format: .currency(code: "USD"))
                .font(.system(size: 54, weight: .bold, design: .rounded))
                .foregroundStyle(accent)
                .contentTransition(.numericText())
                .accessibilityLabel("Estimated value so far")

            Text("\(visibleCount) of \(itemCount) figures recognized")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.white.opacity(0.62))

            Button("Review results", action: skip)
                .font(.headline.weight(.semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 22)
                .frame(minHeight: 48)
                .background(.white.opacity(0.14), in: .capsule)
                .overlay { Capsule().stroke(.white.opacity(0.24)) }
                .accessibilityHint(
                    reduceMotion
                        ? "Shows the bulk scan results"
                        : "Skips the reveal animation and shows the bulk scan results"
                )
        }
        .padding(.horizontal, 30)
        .padding(.vertical, 28)
        .background(.black.opacity(0.78), in: .rect(cornerRadius: 26))
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Bulk scan reveal")
        .accessibilityValue(accessibilitySummary)
    }
}
