import SwiftUI

enum BulkFocusState: Equatable, Sendable {
    case active
    case completed
    case pending
}

struct BulkFocusRegion: Identifiable, Sendable {
    let id: String
    let box: NormalizedBoundingBox?
    let number: Int
    let state: BulkFocusState
}

struct BulkFocusOverlay: View {
    let regions: [BulkFocusRegion]
    let imageRect: CGRect
    let containerSize: CGSize
    let accent: Color

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @ViewBuilder
    var body: some View {
        if regions.isEmpty {
            Color.clear
        } else {
            ZStack {
                Color.black.opacity(0.64)
                    .mask {
                        ZStack {
                            Rectangle().fill(.white)
                            ForEach(regions) { region in
                                if let box = region.box {
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(.black.opacity(maskOpacity(for: region.state)))
                                        .frame(width: box.width * imageRect.width, height: box.height * imageRect.height)
                                        .position(
                                            x: imageRect.minX + (box.x + box.width / 2) * imageRect.width,
                                            y: imageRect.minY + (box.y + box.height / 2) * imageRect.height
                                        )
                                }
                            }
                        }
                    }

                ForEach(regions) { region in
                    if let box = region.box {
                        let rect = CGRect(
                            x: imageRect.minX + box.x * imageRect.width,
                            y: imageRect.minY + box.y * imageRect.height,
                            width: box.width * imageRect.width,
                            height: box.height * imageRect.height
                        )
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(strokeColor(for: region.state), lineWidth: region.state == .active ? 3 : 1.5)
                            .frame(width: rect.width, height: rect.height)
                            .position(x: rect.midX, y: rect.midY)
                        numberBadge(region.number, state: region.state)
                            .position(
                                x: min(max(rect.midX, 18), containerSize.width - 18),
                                y: max(rect.minY, 18)
                            )
                    }
                }
            }
            .allowsHitTesting(false)
            .accessibilityHidden(true)
        }
    }

    private func maskOpacity(for state: BulkFocusState) -> Double {
        switch state {
        case .active: 1
        case .completed: 0.94
        case .pending: 0.84
        }
    }

    private func strokeColor(for state: BulkFocusState) -> Color {
        switch state {
        case .active: accent
        case .completed: accent.opacity(0.72)
        case .pending: .white.opacity(0.46)
        }
    }

    private func numberBadge(_ number: Int, state: BulkFocusState) -> some View {
        Group {
            if state == .completed {
                Image(systemName: "checkmark")
                    .font(.caption2.bold())
            } else {
                Text("\(number)")
                    .font(.caption2.bold().monospacedDigit())
            }
        }
            .foregroundStyle(state == .active ? .black : .white)
            .frame(width: 24, height: 24)
            .background(state == .active ? accent : .black.opacity(0.70), in: .circle)
            .overlay { Circle().stroke(.white.opacity(state == .active ? 0.2 : 0.45)) }
            .opacity(reduceMotion ? 1 : 0.96)
    }
}

struct BulkCameraDetectionHeader: View {
    let count: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("What is this LEGO lot worth?")
                .font(.headline.weight(.bold))
            Text(count == 0 ? "Frame your figures, then tap the shutter" : "\(count) minifigure\(count == 1 ? "" : "s") in frame")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white.opacity(0.76))
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.black.opacity(0.62), in: .rect(cornerRadius: 16))
        .padding(12)
        .allowsHitTesting(false)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Bulk scan. \(count) minifigures in frame")
    }
}
