import SwiftUI

struct ScanProcessingOverlayView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let phase: ScanPhase
    let intent: ScanIntent

    var body: some View {
        ZStack {
            Color.black.opacity(0.52)

            VStack(spacing: BrickValStyle.Primitive.space24) {
                ScanAnalysisIndicator(
                    isIdentifying: phase == .identifying,
                    reduceMotion: reduceMotion
                )

                VStack(spacing: BrickValStyle.Primitive.space8) {
                    Text(title)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)

                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.72))
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 280)
                }
            }
            .padding(.horizontal, BrickValStyle.Primitive.space24)
        }
        .transition(.opacity)
        .animation(
            reduceMotion ? nil : .timingCurve(0.25, 1, 0.5, 1, duration: 0.26),
            value: phase
        )
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(title)
        .accessibilityValue(subtitle)
        .accessibilityAddTraits(.updatesFrequently)
    }

    private var title: String {
        switch phase {
        case .capturing:
            "Locking the photo"
        case .identifying:
            intent == .bulk ? "Reading the group" : "Finding the best match"
        default:
            "Finishing the scan"
        }
    }

    private var subtitle: String {
        switch phase {
        case .capturing:
            "Keeping this exact frame for analysis."
        case .identifying:
            intent == .bulk
                ? "Matching and pricing each minifigure."
                : "Checking identity and current market value."
        default:
            "Your result will appear here."
        }
    }
}

private struct ScanAnalysisIndicator: View {
    let isIdentifying: Bool
    let reduceMotion: Bool

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 28)
                .fill(.black.opacity(0.46))
            RoundedRectangle(cornerRadius: 28)
                .stroke(.white.opacity(0.18), lineWidth: 1)

            Image(systemName: "viewfinder")
                .font(.system(size: 76, weight: .ultraLight))
                .foregroundStyle(.white.opacity(0.88))

            Image(systemName: isIdentifying ? "person.crop.square" : "camera.aperture")
                .font(.system(size: 27, weight: .medium))
                .foregroundStyle(BrickValStyle.ScanResult.accent)
                .contentTransition(.symbolEffect(.replace))

            if isIdentifying {
                Capsule()
                    .fill(BrickValStyle.ScanResult.accent)
                    .frame(width: 68, height: 2)
                    .shadow(color: BrickValStyle.ScanResult.accent.opacity(0.72), radius: 7)
                    .phaseAnimator(reduceMotion ? [false] : [false, true]) { beam, isLowered in
                        beam
                            .offset(y: isLowered ? 29 : -29)
                            .opacity(isLowered ? 0.95 : 0.48)
                    } animation: { _ in
                        .timingCurve(0.65, 0, 0.35, 1, duration: 1.08)
                    }
            } else {
                Circle()
                    .stroke(BrickValStyle.ScanResult.accent.opacity(0.72), lineWidth: 2)
                    .frame(width: 48, height: 48)
                    .phaseAnimator(reduceMotion ? [false] : [false, true]) { ring, isExpanded in
                        ring
                            .scaleEffect(isExpanded ? 1 : 0.82)
                            .opacity(isExpanded ? 0.18 : 0.82)
                    } animation: { _ in
                        .timingCurve(0.25, 1, 0.5, 1, duration: 0.62)
                    }
            }
        }
        .frame(width: 116, height: 116)
        .accessibilityHidden(true)
    }
}

#if DEBUG
struct ScanProcessingDemoView: View {
    var phase: ScanPhase = .identifying

    var body: some View {
        ZStack {
            BrickValStyle.Primitive.gray800
            Image("AvatarClassic")
                .resizable()
                .scaledToFit()
                .frame(width: 190)
            ScanProcessingOverlayView(phase: phase, intent: .single)
        }
        .ignoresSafeArea()
        .preferredColorScheme(.dark)
    }
}

#Preview("Finding a match") {
    ScanProcessingDemoView()
}

#Preview("Locking the photo") {
    ScanProcessingDemoView(phase: .capturing)
}
#endif
