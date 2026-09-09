import SwiftUI

enum BulkFocusState: Equatable, Sendable {
    case active
    case scanned
    case completed
    case pending
    case unresolved
    case preview
    case topFind
}

struct BulkFocusRegion: Identifiable, Sendable {
    let id: String
    let box: NormalizedBoundingBox?
    let number: Int
    let state: BulkFocusState
}

struct BulkFocusCallout: Identifiable, Equatable, Sendable {
    let id: String
    let box: NormalizedBoundingBox
    let number: Int?
    let text: String
    let accessibilityText: String?
    let isLoading: Bool
    let isUnavailable: Bool

    init(
        id: String = "bulk-focus-callout",
        box: NormalizedBoundingBox,
        number: Int? = nil,
        text: String,
        accessibilityText: String? = nil,
        isLoading: Bool,
        isUnavailable: Bool
    ) {
        self.id = id
        self.box = box
        self.number = number
        self.text = text
        self.accessibilityText = accessibilityText
        self.isLoading = isLoading
        self.isUnavailable = isUnavailable
    }
}

struct BulkFocusOverlay: View, Animatable {
    let regions: [BulkFocusRegion]
    let imageRect: CGRect
    let containerSize: CGSize
    let accent: Color
    let isScanning: Bool
    var beamProgress: Double?
    let callout: BulkFocusCallout?
    let persistentCallouts: [BulkFocusCallout]

    init(
        regions: [BulkFocusRegion],
        imageRect: CGRect,
        containerSize: CGSize,
        accent: Color,
        isScanning: Bool = false,
        beamProgress: Double? = nil,
        callout: BulkFocusCallout? = nil,
        persistentCallouts: [BulkFocusCallout] = []
    ) {
        self.regions = regions
        self.imageRect = imageRect
        self.containerSize = containerSize
        self.accent = accent
        self.isScanning = isScanning
        self.beamProgress = beamProgress
        self.callout = callout
        self.persistentCallouts = persistentCallouts
    }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var animatableData: Double {
        get { beamProgress ?? 0 }
        set { beamProgress = newValue }
    }

    @ViewBuilder
    var body: some View {
        if regions.isEmpty && persistentCallouts.isEmpty && callout == nil {
            Color.clear
        } else {
            ZStack {
                if !regions.isEmpty {
                    Color.black.opacity(0.70)
                        .mask {
                            ZStack {
                                Rectangle().fill(.white)
                                ForEach(regions) { region in
                                    if let box = region.box {
                                        RoundedRectangle(cornerRadius: 12)
                                            .fill(.black.opacity(maskOpacity(for: displayedState(for: region))))
                                            .frame(width: box.width * imageRect.width, height: box.height * imageRect.height)
                                            .position(
                                                x: imageRect.minX + (box.x + box.width / 2) * imageRect.width,
                                                y: imageRect.minY + (box.y + box.height / 2) * imageRect.height
                                            )
                                    }
                                }
                            }
                        }

                    if isScanning, let beamProgress, !reduceMotion {
                        scanBeam(at: beamProgress)
                    }

                    ForEach(regions) { region in
                        if let box = region.box {
                            let state = displayedState(for: region)
                            let rect = CGRect(
                                x: imageRect.minX + box.x * imageRect.width,
                                y: imageRect.minY + box.y * imageRect.height,
                                width: box.width * imageRect.width,
                                height: box.height * imageRect.height
                            )
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(
                                    strokeColor(for: state),
                                    lineWidth: state == .active || state == .topFind ? 3 : 1.5
                                )
                                .frame(width: rect.width, height: rect.height)
                                .position(x: rect.midX, y: rect.midY)
                            numberBadge(region.number, state: state)
                                .position(
                                    x: min(max(rect.midX, 18), containerSize.width - 18),
                                    y: max(rect.minY, 18)
                            )
                        }
                    }
                }

                ForEach(persistentCallouts) { persistentCallout in
                    priceCallout(persistentCallout)
                }

                if let callout {
                    priceCallout(callout)
                }
            }
            .allowsHitTesting(false)
            .accessibilityElement(children: .contain)
            .accessibilityHidden(persistentCallouts.isEmpty && callout == nil)
        }
    }

    private func displayedState(for region: BulkFocusRegion) -> BulkFocusState {
        guard isScanning,
              region.state == .pending,
              let beamProgress,
              let box = region.box
        else { return region.state }
        return box.y + box.height / 2 <= beamProgress ? .scanned : .pending
    }

    private func maskOpacity(for state: BulkFocusState) -> Double {
        switch state {
        case .active, .topFind: 1
        case .completed: 0.94
        case .scanned: 0.92
        case .pending: 0.80
        case .unresolved: 0.86
        case .preview: 0.78
        }
    }

    private func strokeColor(for state: BulkFocusState) -> Color {
        switch state {
        case .active: accent
        case .topFind: topFindColor
        case .completed: accent.opacity(0.72)
        case .scanned: .white.opacity(0.70)
        case .pending: .white.opacity(0.46)
        case .unresolved: .white.opacity(0.66)
        case .preview: .white.opacity(0.72)
        }
    }

    private func numberBadge(_ number: Int, state: BulkFocusState) -> some View {
        Group {
            if state == .topFind {
                Image(systemName: "star.fill")
                    .font(.caption2.bold())
            } else if state == .unresolved {
                Image(systemName: "questionmark")
                    .font(.caption2.bold())
            } else if state == .completed {
                Image(systemName: "checkmark")
                    .font(.caption2.bold())
            } else if state == .preview {
                Image(systemName: "lock.fill")
                    .font(.caption2.bold())
            } else {
                Text("\(number)")
                    .font(.caption2.bold().monospacedDigit())
            }
        }
            .foregroundStyle(state == .active || state == .topFind ? .black : .white)
            .frame(width: 24, height: 24)
            .background(
                state == .active ? accent : state == .topFind ? topFindColor : state == .preview ? .black.opacity(0.56) : .black.opacity(0.70),
                in: .circle
            )
            .overlay {
                Circle().stroke(.white.opacity(state == .active || state == .topFind ? 0.2 : 0.45))
            }
            .opacity(reduceMotion ? 1 : 0.96)
    }

    private func scanBeam(at progress: Double) -> some View {
        let y = imageRect.minY + min(max(progress, 0), 1) * imageRect.height
        return ZStack {
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [.clear, accent.opacity(0.35), .white, accent.opacity(0.35), .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .frame(width: imageRect.width, height: 2)
            Rectangle()
                .fill(.white.opacity(0.82))
                .frame(width: imageRect.width * 0.34, height: 1)
                .blur(radius: 4)
        }
        .position(x: imageRect.midX, y: y)
    }

    private func priceCallout(_ callout: BulkFocusCallout) -> some View {
        let rect = imageBox(callout.box)
        let isNearTop = rect.minY < imageRect.minY + 38
        let y = isNearTop ? rect.maxY + 16 : rect.minY - 16
        let spokenPrice = callout.accessibilityText ?? callout.text
        return Group {
            if callout.isLoading {
                HStack(spacing: 7) {
                    ProgressView()
                        .controlSize(.small)
                        .tint(.white)
                    Text(callout.text)
                        .font(.caption.weight(.bold))
                }
                .foregroundStyle(.white)
                .accessibilityLabel("Checking price")
            } else {
                Text(callout.text)
                    .font(.caption.weight(.bold).monospacedDigit())
                    .foregroundStyle(callout.isUnavailable ? .white : .black)
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)
            }
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(callout.isLoading ? .black.opacity(0.76) : callout.isUnavailable ? .white.opacity(0.24) : accent, in: .capsule)
        .overlay { Capsule().stroke(.white.opacity(callout.isLoading || callout.isUnavailable ? 0.32 : 0.18)) }
        .position(
            x: min(max(rect.midX, 58), containerSize.width - 58),
            y: min(max(y, 22), containerSize.height - 22)
        )
        .accessibilityLabel(
            callout.isLoading
                ? "Checking price"
                : callout.isUnavailable
                    ? "Price unavailable"
                    : "Price \(spokenPrice)"
        )
        .accessibilityIdentifier("bulkResults.priceCallout.\(callout.id)")
        .transition(reduceMotion ? .opacity : .opacity.combined(with: .scale(scale: 0.88)))
        .animation(reduceMotion ? nil : .easeOut(duration: 0.22), value: callout)
    }

    private func imageBox(_ box: NormalizedBoundingBox) -> CGRect {
        CGRect(
            x: imageRect.minX + box.x * imageRect.width,
            y: imageRect.minY + box.y * imageRect.height,
            width: box.width * imageRect.width,
            height: box.height * imageRect.height
        )
    }

    private var topFindColor: Color {
        Color(red: 1.0, green: 0.78, blue: 0.24)
    }
}
