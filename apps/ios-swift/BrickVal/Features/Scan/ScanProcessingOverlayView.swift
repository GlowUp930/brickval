import SwiftUI

struct ScanProcessingOverlayView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let phase: ScanPhase
    let intent: ScanIntent

    var body: some View {
        ZStack {
            Color.black.opacity(0.52)

            VStack(spacing: BrickValStyle.Primitive.space24) {
                BrickValLogoLoader(
                    isHandingOff: false,
                    showsBackground: false,
                    showsWordmark: true,
                    scale: 0.78
                )
                .frame(width: 176, height: 250)

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
        .transition(.opacity.combined(with: .scale(scale: 0.98)))
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
            intent == .bulk ? "Finding minifigures" : "Locking the photo"
        case .identifying:
            intent == .bulk ? "Checking matches" : "Finding the best match"
        default:
            "Finishing the scan"
        }
    }

    private var subtitle: String {
        switch phase {
        case .capturing:
            intent == .bulk
                ? "Searching the photo for every visible figure."
                : "Keeping this exact frame for analysis."
        case .identifying:
            intent == .bulk
                ? "Matching and pricing each minifigure."
                : "Checking identity and current market value."
        default:
            "Your result will appear here."
        }
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
