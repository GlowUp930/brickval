import SwiftUI
import UIKit

struct BulkModeBoostEffect: View {
    enum Variant: String, CaseIterable, Identifiable, Sendable {
        case smoothCharge
        case lightningLead
        case powerBands

        var id: Self { self }

        var title: String {
            switch self {
            case .smoothCharge: "Smooth charge"
            case .lightningLead: "Lightning lead"
            case .powerBands: "Power bands"
            }
        }

        var detail: String {
            switch self {
            case .smoothCharge: "One continuous transfer from Single into Bulk."
            case .lightningLead: "The bolt leads the charge into the new mode."
            case .powerBands: "Three smooth bands give the switch extra thrust."
            }
        }
    }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.layoutDirection) private var layoutDirection

    let trigger: Int
    let variant: Variant

    @State private var progress = 0.0
    @State private var opacity = 0.0

    init(trigger: Int, variant: Variant = .smoothCharge) {
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
        // Keep the effect's drawing coordinates physical so an RTL locale
        // still gets a real left-to-right charge inside the Bulk segment.
        .environment(\.layoutDirection, .leftToRight)
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
            let inset: CGFloat = 2
            let availableWidth = max(proxy.size.width - inset * 2, 0)
            let fillWidth = availableWidth * progress
            let fillHeight = max(proxy.size.height - inset * 2, 0)
            let green = BrickValStyle.Semantic.valuePositive
            let edgeX = min(max(inset + fillWidth, inset), proxy.size.width - inset)

            ZStack {
                switch variant {
                case .smoothCharge:
                    chargeShape(
                        width: fillWidth,
                        height: fillHeight,
                        x: inset + fillWidth * 0.5,
                        y: proxy.size.height * 0.5,
                        color: green.opacity(0.68)
                    )
                    chargeEdge(at: edgeX, in: proxy.size, color: green)

                case .lightningLead:
                    chargeShape(
                        width: fillWidth,
                        height: fillHeight,
                        x: inset + fillWidth * 0.5,
                        y: proxy.size.height * 0.5,
                        color: green.opacity(0.52)
                    )
                    chargeEdge(at: edgeX, in: proxy.size, color: .white)
                        .shadow(color: green.opacity(0.92), radius: 7)
                    Image("BulkLightningBolt")
                        .renderingMode(.template)
                        .resizable()
                        .scaledToFit()
                        .foregroundStyle(.white)
                        .frame(width: 18, height: 18)
                        .scaleEffect(0.84 + progress * 0.16)
                        .opacity(min(progress * 10, 1))
                        .position(x: edgeX, y: proxy.size.height * 0.5)

                case .powerBands:
                    ForEach(0..<3, id: \.self) { index in
                        let bandProgress = min(
                            max(progress * 1.2 - Double(index) * 0.1, 0),
                            1
                        )
                        let bandHeight = max((fillHeight - 6) / 3, 4)
                        let bandY = inset + bandHeight * 0.5 + CGFloat(index) * (bandHeight + 3)
                        chargeShape(
                            width: availableWidth * bandProgress,
                            height: bandHeight,
                            x: inset + availableWidth * bandProgress * 0.5,
                            y: bandY,
                            color: green.opacity(0.26 + bandProgress * 0.46)
                        )
                    }
                    chargeEdge(at: edgeX, in: proxy.size, color: green.opacity(0.95))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        }
    }

    private func chargeShape(
        width: CGFloat,
        height: CGFloat,
        x: CGFloat,
        y: CGFloat,
        color: Color
    ) -> some View {
        RoundedRectangle(cornerRadius: 24, style: .continuous)
            .fill(color)
            .frame(width: max(width, 0), height: max(height, 0))
            .position(x: x, y: y)
    }

    private func chargeEdge(at x: CGFloat, in size: CGSize, color: Color) -> some View {
        Capsule()
            .fill(color.opacity(0.92))
            .frame(width: 1.5, height: max(size.height - 10, 0))
            .position(x: x, y: size.height * 0.5)
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
            try? await Task.sleep(for: .milliseconds(240))
            guard !Task.isCancelled else { return }
            withAnimation(.easeOut(duration: 0.12)) {
                opacity = 0
            }
            return
        }

        withAnimation(.easeOut(duration: 0.44)) {
            progress = 1
            opacity = 1
        }
        try? await Task.sleep(for: .milliseconds(490))
        guard !Task.isCancelled else { return }
        withAnimation(.easeOut(duration: 0.14)) {
            opacity = 0
        }
    }
}

struct ScanModePickerLabel: View {
    @Environment(\.locale) private var locale
    let intent: ScanIntent

    @ViewBuilder
    var body: some View {
        switch intent {
        case .single:
            Label(intent.title(locale: locale), systemImage: intent.iconName)
        case .bulk:
            Text(intent.title(locale: locale))
        }
    }
}

struct BulkModePickerIconOverlay: View {
    @Environment(\.layoutDirection) private var layoutDirection
    @Environment(\.locale) private var locale

    var body: some View {
        GeometryReader { proxy in
            BulkLightningBoltIcon()
                .frame(width: 15, height: 15)
                .position(
                    x: BulkModePickerLayout.iconCenterX(
                        controlWidth: proxy.size.width,
                        layoutDirection: layoutDirection,
                        label: ScanIntent.bulk.title(locale: locale)
                    ),
                    y: proxy.size.height * 0.5
                )
        }
        .environment(\.layoutDirection, .leftToRight)
        .frame(maxWidth: 340, minHeight: 56, maxHeight: 56)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

enum BulkModePickerLayout {
    static func iconCenterX(
        controlWidth: CGFloat,
        layoutDirection: LayoutDirection,
        label: String,
        iconWidth: CGFloat = 15,
        gap: CGFloat = 8
    ) -> CGFloat {
        let segmentCenter = controlWidth * (layoutDirection == .leftToRight ? 0.75 : 0.25)
        let segmentHalfWidth = controlWidth * 0.25
        let labelWidth = (label as NSString).size(
            withAttributes: [.font: UIFont.preferredFont(forTextStyle: .body)]
        ).width
        let desiredOffset = labelWidth * 0.5 + iconWidth * 0.5 + gap
        let maximumOffset = max(segmentHalfWidth - iconWidth * 0.5 - 8, 0)
        return segmentCenter - min(desiredOffset, maximumOffset)
    }
}

private struct BulkLightningBoltIcon: View {
    var body: some View {
        Image("BulkLightningBolt")
            .renderingMode(.template)
            .resizable()
            .scaledToFit()
            .frame(width: 15, height: 15)
            .foregroundStyle(.primary)
            .accessibilityHidden(true)
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

                    Text("All three move smoothly from Single into Bulk. Tap Replay to watch each charge again.")
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
        .environment(\.layoutDirection, .leftToRight)
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
                ForEach(ScanIntent.allCases) { intent in
                    ScanModePickerLabel(intent: intent).tag(intent)
                }
            }
            .pickerStyle(.segmented)
            .controlSize(.large)
            .frame(maxWidth: 340, minHeight: 56)
            .overlay {
                BulkModePickerIconOverlay()
            }
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
