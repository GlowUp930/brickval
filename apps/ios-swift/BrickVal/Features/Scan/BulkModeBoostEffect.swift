import SwiftUI

struct BulkModeBoostEffect: View {
    enum Variant: String, CaseIterable, Identifiable, Sendable {
        case sweep
        case scanline
        case meter

        var id: Self { self }

        var title: String {
            switch self {
            case .sweep: "Solid sweep"
            case .scanline: "Scanline sweep"
            case .meter: "Charge meter"
            }
        }

        var detail: String {
            switch self {
            case .sweep: "One clean green wash across Bulk."
            case .scanline: "A green charge with a moving edge."
            case .meter: "Five compact stages fill in sequence."
            }
        }
    }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.layoutDirection) private var layoutDirection

    let trigger: Int
    let variant: Variant

    @State private var progress = 0.0
    @State private var opacity = 0.0

    init(trigger: Int, variant: Variant = .sweep) {
        self.trigger = trigger
        self.variant = variant
    }

    var body: some View {
        GeometryReader { proxy in
            bulkSegmentFill
                .frame(
                    width: proxy.size.width * 0.5,
                    height: max(proxy.size.height - 4, 0)
                )
                .position(
                    x: proxy.size.width * (layoutDirection == .leftToRight ? 0.75 : 0.25),
                    y: proxy.size.height * 0.5
                )
        }
        .frame(maxWidth: .infinity, minHeight: 56, maxHeight: 56)
        .opacity(opacity)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .task(id: trigger) {
            await play()
        }
    }

    private var bulkSegmentFill: some View {
        GeometryReader { proxy in
            let fillWidth = max(0, proxy.size.width * progress)
            let green = BrickValStyle.Semantic.valuePositive

            ZStack(alignment: .leading) {
                switch variant {
                case .sweep:
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(green.opacity(0.66))
                        .frame(width: fillWidth)
                    sweepEdge(at: fillWidth, height: proxy.size.height, color: green)

                case .scanline:
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(green.opacity(0.48))
                        .frame(width: fillWidth)
                    sweepEdge(at: fillWidth, height: proxy.size.height, color: .white)
                        .shadow(color: green.opacity(0.9), radius: 7)

                case .meter:
                    HStack(spacing: 3) {
                        ForEach(0..<5, id: \.self) { index in
                            let stageStart = Double(index) / 5
                            let stageProgress = min(max((progress - stageStart) * 5, 0), 1)
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .fill(green.opacity(0.16 + stageProgress * 0.58))
                                .overlay(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                                        .fill(green.opacity(0.72))
                                        .frame(maxWidth: .infinity)
                                        .scaleEffect(x: stageProgress, y: 1, anchor: .leading)
                                }
                        }
                    }
                    .padding(.horizontal, 6)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .padding(.horizontal, 2)
            .padding(.vertical, 2)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        }
    }

    private func sweepEdge(at x: CGFloat, height: CGFloat, color: Color) -> some View {
        Rectangle()
            .fill(color.opacity(0.9))
            .frame(width: 1.5, height: max(height - 8, 0))
            .offset(x: max(x - 1.5, 0))
    }

    private func play() async {
        guard trigger > 0 else { return }

        progress = 0
        opacity = reduceMotion ? 1 : 0

        if reduceMotion {
            progress = 1
            withAnimation(.easeOut(duration: 0.12)) {
                opacity = 1
            }
            try? await Task.sleep(for: .milliseconds(220))
            guard !Task.isCancelled else { return }
            withAnimation(.easeOut(duration: 0.12)) {
                opacity = 0
            }
            return
        }

        withAnimation(.easeOut(duration: 0.42)) {
            progress = 1
            opacity = 1
        }
        try? await Task.sleep(for: .milliseconds(470))
        guard !Task.isCancelled else { return }
        withAnimation(.easeOut(duration: 0.14)) {
            opacity = 0
        }
    }
}

#if DEBUG
struct BulkModeFillDraftsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space20) {
                    Text("Bulk button animation drafts")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(BrickValStyle.Semantic.textPrimary)

                    Text("Each version fills the Bulk segment from left to right. Tap Replay to watch it again.")
                        .font(.subheadline)
                        .foregroundStyle(BrickValStyle.Semantic.textSecondary)

                    ForEach(BulkModeBoostEffect.Variant.allCases) { variant in
                        BulkModeFillDraftCard(variant: variant)
                    }
                }
                .padding(BrickValStyle.Primitive.space20)
            }
            .background(BrickValStyle.Semantic.canvas.ignoresSafeArea())
            .navigationTitle("Drafts")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done", action: dismiss.callAsFunction)
                }
            }
        }
    }
}

private struct BulkModeFillDraftCard: View {
    let variant: BulkModeBoostEffect.Variant

    @State private var selection: ScanIntent = .bulk
    @State private var trigger = 1

    var body: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(variant.title)
                    .font(.headline)
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                Text(variant.detail)
                    .font(.footnote)
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
            }

            Picker("Scan mode", selection: $selection) {
                ForEach(ScanIntent.allCases) {
                    Label($0.title, systemImage: $0.iconName).tag($0)
                }
            }
            .pickerStyle(.segmented)
            .controlSize(.large)
            .frame(maxWidth: 340, minHeight: 56)
            .overlay {
                if selection == .bulk {
                    BulkModeBoostEffect(trigger: trigger, variant: variant)
                }
            }

            Button("Replay", systemImage: "arrow.clockwise") {
                trigger &+= 1
            }
            .buttonStyle(.bordered)
            .frame(minHeight: 44)
        }
        .padding(BrickValStyle.Primitive.space16)
        .background(BrickValStyle.Semantic.surfaceMuted, in: .rect(cornerRadius: 16))
    }
}
#endif
