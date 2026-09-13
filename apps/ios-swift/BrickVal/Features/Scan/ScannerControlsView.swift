import PhotosUI
import SwiftUI

struct ScannerControlsView: View {
    let intent: ScanIntent
    let automaticScanAvailable: Bool
    let isTorchEnabled: Bool
    let isBusy: Bool
    let isCameraReady: Bool
    let isImportingPhoto: Bool
    @Binding var bulkPhotoItem: PhotosPickerItem?
    let toggleTorch: () -> Void
    let capture: () -> Void

    var body: some View {
        ZStack {
            Button(captureLabel, systemImage: "camera.circle.fill", action: capture)
                .labelStyle(.iconOnly)
                .font(.system(size: 66))
                .foregroundStyle(.white, .tint)
                .disabled(isBusy || !isCameraReady || isImportingPhoto)
                .accessibilityHint(captureHint)
                .accessibilityIdentifier("scanner.capture")

            HStack {
                if intent == .bulk {
                    PhotosPicker(
                        selection: $bulkPhotoItem,
                        matching: .images,
                        photoLibrary: .shared()
                    ) {
                        Image(systemName: isImportingPhoto ? "hourglass" : "photo.on.rectangle")
                            .font(.title3.weight(.semibold))
                            .frame(width: 48, height: 48)
                    }
                    .buttonStyle(.bordered)
                    .disabled(isBusy || isImportingPhoto)
                    .accessibilityLabel("Choose bulk scan photo")
                    .accessibilityHint("Upload a photo from your library to scan multiple minifigures")
                } else {
                    Color.clear
                        .frame(width: 48, height: 48)
                        .accessibilityHidden(true)
                }
                Spacer()
                Button(isTorchEnabled ? "Turn torch off" : "Turn torch on", systemImage: isTorchEnabled ? "flashlight.off.fill" : "flashlight.on.fill", action: toggleTorch)
                    .labelStyle(.iconOnly)
                    .frame(width: 48, height: 48)
                    .buttonStyle(.bordered)
                    .disabled(isBusy || !isCameraReady || isImportingPhoto)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 72)
        .padding()
    }

    private var captureLabel: String {
        intent == .bulk ? BrickValLocalization.localized("Capture bulk scan") : BrickValLocalization.localized("Scan minifigure")
    }

    private var captureHint: String {
        automaticScanAvailable && intent == .single
            ? BrickValLocalization.localized("Capture now instead of waiting for automatic scanning")
            : BrickValLocalization.localized("Capture the camera image")
    }
}
