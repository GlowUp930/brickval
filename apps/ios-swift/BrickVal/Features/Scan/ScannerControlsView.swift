import SwiftUI

struct ScannerControlsView: View {
    let intent: ScanIntent
    let isTorchEnabled: Bool
    let isBusy: Bool
    let toggleTorch: () -> Void
    let capture: () -> Void

    var body: some View {
        HStack(spacing: 24) {
            if intent == .single {
                Label("Scanning automatically", systemImage: "viewfinder")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 64)
            } else {
                Spacer()
                Button("Capture bulk scan", systemImage: "camera.circle.fill", action: capture)
                    .labelStyle(.iconOnly)
                    .font(.system(size: 66))
                    .foregroundStyle(.white, .tint)
                    .disabled(isBusy)
                Spacer()
            }

            Button(isTorchEnabled ? "Turn torch off" : "Turn torch on", systemImage: isTorchEnabled ? "flashlight.off.fill" : "flashlight.on.fill", action: toggleTorch)
                .labelStyle(.iconOnly)
                .frame(width: 48, height: 48)
                .buttonStyle(.bordered)
                .disabled(isBusy)
        }
        .padding()
    }
}
