import SwiftUI

struct ScanProcessingOverlayView: View {
    let phase: ScanPhase
    let intent: ScanIntent

    var body: some View {
        ZStack {
            Color.black.opacity(0.34)

            VStack(spacing: 12) {
                ProgressView()
                    .controlSize(.large)
                    .tint(BrickValStyle.ScanResult.accent)

                Text(title)
                    .font(.headline.weight(.semibold))
                    .multilineTextAlignment(.center)

                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 20)
            .frame(maxWidth: 290)
            .background(.regularMaterial, in: .rect(cornerRadius: 18))
            .overlay {
                RoundedRectangle(cornerRadius: 18)
                    .stroke(.white.opacity(0.16))
            }
        }
        .transition(.opacity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(title)
        .accessibilityValue(subtitle)
    }

    private var title: String {
        switch phase {
        case .capturing:
            intent == .bulk ? "Preparing your bulk scan…" : "Preparing your scan…"
        case .identifying:
            intent == .bulk ? "Analyzing minifigures…" : "Analyzing your minifigure…"
        default:
            "Working…"
        }
    }

    private var subtitle: String {
        switch phase {
        case .capturing:
            "Your photo is being prepared."
        case .identifying:
            intent == .bulk
                ? "Identifying and pricing each figure."
                : "Finding the best match and current value."
        default:
            "Please wait a moment."
        }
    }
}
