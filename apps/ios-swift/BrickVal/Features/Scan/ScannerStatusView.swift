import SwiftUI

struct ScannerStatusView: View {
    let phase: ScanPhase
    let intent: ScanIntent
    let smartScanMessage: String?
    let retryBulkScan: (() -> Void)?

    var body: some View {
        VStack(spacing: 6) {
            if phase == .identifying {
                ProgressView()
                    .tint(.primary)
            }
            Label(statusText, systemImage: icon)
                .font(.subheadline.bold())
                .multilineTextAlignment(.center)
            if let smartScanMessage {
                Text(smartScanMessage)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            if case .failed = phase, intent == .bulk, let retryBulkScan {
                Button("Try again", systemImage: "arrow.clockwise", action: retryBulkScan)
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    .accessibilityHint("Retries this bulk scan without selecting the photo again")
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

    private var statusText: String {
        if intent == .bulk, phase == .searching {
            return "Frame up to 10 figures, then tap the shutter"
        }
        return phase.statusText
    }
}
