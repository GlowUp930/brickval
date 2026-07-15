import PhotosUI
import SwiftUI

struct ScannerControlsView: View {
    let isTorchEnabled: Bool
    let isBusy: Bool
    @Binding var photoSelection: PhotosPickerItem?
    let toggleTorch: () -> Void
    let capture: () -> Void
    let openManualLookup: () -> Void

    var body: some View {
        HStack(spacing: 28) {
            PhotosPicker(selection: $photoSelection, matching: .images) {
                Image(systemName: "photo.on.rectangle")
                    .frame(width: 48, height: 48)
                    .accessibilityLabel("Choose photo")
            }
            .buttonStyle(.bordered)
            .disabled(isBusy)

            Button("Capture", systemImage: "camera.circle.fill", action: capture)
                .labelStyle(.iconOnly)
                .font(.system(size: 66))
                .foregroundStyle(.white, .tint)
                .disabled(isBusy)

            Menu("More scan options", systemImage: "ellipsis.circle") {
                Button("Manual lookup", systemImage: "keyboard", action: openManualLookup)
                Button(isTorchEnabled ? "Turn torch off" : "Turn torch on", systemImage: isTorchEnabled ? "flashlight.off.fill" : "flashlight.on.fill", action: toggleTorch)
            }
            .labelStyle(.iconOnly)
            .frame(width: 48, height: 48)
            .buttonStyle(.bordered)
        }
        .padding()
    }
}
