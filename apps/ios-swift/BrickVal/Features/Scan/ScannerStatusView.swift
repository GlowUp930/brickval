import SwiftUI

struct ScannerStatusView: View {
    let phase: ScanPhase
    let smartScanMessage: String?

    var body: some View {
        VStack(spacing: 6) {
            if phase == .identifying {
                ProgressView()
                    .tint(.primary)
            }
            Label(phase.statusText, systemImage: icon)
                .font(.subheadline.bold())
                .multilineTextAlignment(.center)
            if let smartScanMessage {
                Text(smartScanMessage)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.regularMaterial, in: .capsule)
        .padding()
    }

    private var icon: String {
        switch phase {
        case .holding: "hand.raised.fill"
        case .capturing: "camera.fill"
        case .identifying: "sparkles"
        case .result: "checkmark.circle.fill"
        case .failed: "exclamationmark.triangle.fill"
        default: "viewfinder"
        }
    }
}
