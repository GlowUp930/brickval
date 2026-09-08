import SwiftUI

struct ScanProcessingOverlayView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let phase: ScanPhase
    let intent: ScanIntent

    @State private var showsAverageExplanation = false

    var body: some View {
        ZStack {
            Color.black.opacity(0.52)

            VStack(spacing: BrickValStyle.Primitive.space16) {
                BrickValLogoLoader(
                    isHandingOff: false,
                    showsBackground: false,
                    showsWordmark: true,
                    scale: 0.78
                )
                .frame(width: 176, height: 210)

                VStack(spacing: BrickValStyle.Primitive.space8) {
                    Text(title)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 320)
                        .fixedSize(horizontal: false, vertical: true)
                        .layoutPriority(1)

                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.72))
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 320)
                        .fixedSize(horizontal: false, vertical: true)
                        .layoutPriority(1)
                }
            }
            .padding(.horizontal, BrickValStyle.Primitive.space24)
        }
        .transition(reduceMotion ? .identity : .opacity)
        .animation(
            reduceMotion ? nil : .timingCurve(0.25, 1, 0.5, 1, duration: 0.26),
            value: phase
        )
        .task(id: phase) {
            showsAverageExplanation = false
            guard phase == .identifying else { return }
            do {
                try await Task.sleep(for: .milliseconds(1_500))
            } catch {
                return
            }
            guard !Task.isCancelled else { return }
            withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.2)) {
                showsAverageExplanation = true
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(title)
        .accessibilityValue(subtitle)
        .accessibilityAddTraits(.updatesFrequently)
        .accessibilityIdentifier("scanner.processing.status")
    }

    private var title: String {
        if showsAverageExplanation, phase == .identifying {
            return BrickValLocalization.localized("Calculating the average market price")
        }
        return switch phase {
        case .capturing:
            intent == .bulk ? BrickValLocalization.localized("Finding minifigures") : BrickValLocalization.localized("Locking the photo")
        case .identifying:
            intent == .bulk ? BrickValLocalization.localized("Checking matches") : BrickValLocalization.localized("Finding the best match")
        default:
            BrickValLocalization.localized("Finishing the scan")
        }
    }

    private var subtitle: String {
        if showsAverageExplanation, phase == .identifying {
            return BrickValLocalization.localized("We use recent sold prices when available.")
        }
        return switch phase {
        case .capturing:
            intent == .bulk
                ? BrickValLocalization.localized("Searching the photo for every visible figure.")
                : BrickValLocalization.localized("Keeping this exact frame for analysis.")
        case .identifying:
            intent == .bulk
                ? BrickValLocalization.localized("Matching and pricing each minifigure.")
                : BrickValLocalization.localized("Checking identity and current market value.")
        default:
            BrickValLocalization.localized("Your result will appear here.")
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
