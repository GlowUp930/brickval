import PostHog
import SwiftUI

struct ScannerStatusView: View {
    let phase: ScanPhase
    let intent: ScanIntent
    let smartScanMessage: String?
    let retry: (() -> Void)?

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
            if case .failed = phase, let retry {
                Button("Try again", systemImage: "arrow.clockwise", action: retry)
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    // Keep the recovery action a real, independently hittable
                    // control on every simulator/runtime. The small button
                    // style can otherwise produce a sub-44pt target and, when
                    // the localized error wraps, UIKit may report it outside
                    // the visible banner bounds.
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
                    .accessibilityIdentifier("scanner.retry")
                    .accessibilityHint(retryHint)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.regularMaterial, in: .capsule)
        .padding()
        .contentShape(Capsule())
        .postHogNoMask()
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
            return BrickValLocalization.localized("Frame up to 60 figures, then tap the shutter")
        }
        return phase.statusText
    }

    private var retryHint: String {
        intent == .bulk
            ? BrickValLocalization.localized("Retries the current bulk scan or prepares the camera again")
            : BrickValLocalization.localized("Prepares the camera again")
    }
}
