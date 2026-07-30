import SwiftUI

struct ScannerControlsView: View {
    let intent: ScanIntent
    let automaticScanAvailable: Bool
    let isTorchEnabled: Bool
    let isBusy: Bool
    let toggleTorch: () -> Void
    let capture: () -> Void

    var body: some View {
        ZStack {
            if intent == .single, automaticScanAvailable {
                Label("Scanning automatically", systemImage: "viewfinder")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .frame(minHeight: 64)
            } else {
                Button(captureLabel, systemImage: "camera.circle.fill", action: capture)
                    .labelStyle(.iconOnly)
                    .font(.system(size: 66))
                    .foregroundStyle(.white, .tint)
                    .disabled(isBusy)
            }

            HStack {
                Spacer()
                Button(isTorchEnabled ? "Turn torch off" : "Turn torch on", systemImage: isTorchEnabled ? "flashlight.off.fill" : "flashlight.on.fill", action: toggleTorch)
                    .labelStyle(.iconOnly)
                    .frame(width: 48, height: 48)
                    .buttonStyle(.bordered)
                    .disabled(isBusy)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 72)
        .padding()
    }

    private var captureLabel: String {
        intent == .bulk ? "Capture bulk scan" : "Scan minifigure"
    }
}
