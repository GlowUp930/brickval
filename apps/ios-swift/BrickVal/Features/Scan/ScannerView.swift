import UIKit
import SwiftUI

struct ScannerView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.openURL) private var openURL
    @State private var store: ScanStore
    private let runsCameraLoop: Bool

    init(api: BrickValAPIClient = .live()) {
        let store = ScanStore(api: api)
#if DEBUG
        let isProcessingLayoutDemo = ProcessInfo.processInfo.arguments.contains("-showScannerProcessingLayoutDemo")
        if isProcessingLayoutDemo,
           let imageData = UIImage(named: "AvatarClassic")?.jpegData(compressionQuality: 0.9) {
            store.configureProcessingLayoutDemo(imageData: imageData)
        }
        runsCameraLoop = !isProcessingLayoutDemo
#else
        runsCameraLoop = true
#endif
        _store = State(initialValue: store)
    }

    var body: some View {
        @Bindable var store = store
        VStack(spacing: 0) {
            Picker("Scan mode", selection: $store.intent) {
                ForEach(ScanIntent.allCases) {
                    Label($0.title, systemImage: $0.iconName).tag($0)
                }
            }
            .pickerStyle(.segmented)
            .controlSize(.large)
            .frame(maxWidth: 340, minHeight: 56)
            .accessibilityIdentifier("scanner.modePicker")
            .padding(.top, 8)
            .padding(.bottom, 12)

            GeometryReader { proxy in
                let cameraSize = ScannerCameraLayout.size(fitting: proxy.size)

                ZStack {
                    ZStack(alignment: .top) {
                        CameraPreview(session: store.captureSession)
                            .background(.black)
                        if let data = store.frozenImageData {
                            FrozenScanImageView(data: data)
                                .transition(.opacity)
                        }
                        if ![.capturing, .identifying].contains(store.phase) {
                            ViewfinderOverlayView()
                            DetectionOverlayView(observations: store.observations)
                            ScannerStatusView(
                                phase: store.phase,
                                intent: store.intent,
                                smartScanMessage: store.intent == .single ? store.smartScanMessage : nil
                            )
                        }
                    }
                    .overlay {
                        if [.capturing, .identifying].contains(store.phase) {
                            ScanProcessingOverlayView(phase: store.phase, intent: store.intent)
                        }
                    }
                    .frame(width: cameraSize.width, height: cameraSize.height)
                    .clipped()
                    .accessibilityHidden(true)

                    Color.clear
                        .frame(width: cameraSize.width, height: cameraSize.height)
                        .contentShape(Rectangle())
                        .accessibilityElement()
                        .accessibilityLabel(
                            [.capturing, .identifying].contains(store.phase)
                                ? "Captured scan"
                                : "Camera preview"
                        )
                        .accessibilityValue(store.phase.statusText)
                        .accessibilityIdentifier("scanner.cameraStage")
                }
                .frame(width: cameraSize.width, height: cameraSize.height)
                .clipShape(.rect(cornerRadius: 24))
                .animation(.easeInOut(duration: 0.28), value: store.phase)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
            .padding(.horizontal)

            if store.authorizationStatus == .denied {
                Button("Open camera settings", systemImage: "gear") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                }
                .buttonStyle(.borderedProminent)
                .padding(.top)
            }

            ScannerControlsView(
                intent: store.intent,
                automaticScanAvailable: store.canUseSmartScan,
                isTorchEnabled: store.isTorchEnabled,
                isBusy: [.capturing, .identifying].contains(store.phase),
                toggleTorch: { Task { await store.toggleTorch() } },
                capture: { Task { await store.captureManually() } }
            )
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("scanner.controls")
        }
        .toolbar(.hidden, for: .navigationBar)
        .task(id: scenePhase) {
            guard runsCameraLoop else { return }
            if scenePhase == .active {
                await store.runCameraLoop()
            } else {
                await store.stopCamera()
            }
        }
        .task(id: preferences.scanImprovementConsent) {
            store.setFeedbackConsent(preferences.scanImprovementConsent)
        }
        .sheet(item: $store.presentedSheet) { sheet in
            switch sheet {
            case .manualLookup: ManualLookupView(store: store)
            case .partColor(let detection): PartColorSelectionView(detection: detection, store: store)
            case .bulkResults(let imageData, let items):
                BulkScanResultsView(imageData: imageData, items: items, store: store)
            case .result(let result): ScanResultView(result: result, reset: store.reset)
            case .review(let review): ScanReviewView(review: review, store: store)
            }
        }
        .overlay(alignment: .top) {
            if let message = store.successMessage {
                Label(message, systemImage: "checkmark.circle.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.black)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(BrickValStyle.ScanResult.accent, in: .capsule)
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.easeOut(duration: 0.2), value: store.successMessage)
    }
}

enum ScannerCameraLayout {
    static let aspectRatio = 3.0 / 4.0

    static func size(fitting availableSize: CGSize) -> CGSize {
        guard availableSize.width > 0, availableSize.height > 0 else { return .zero }

        let widthLimitedHeight = availableSize.width / aspectRatio
        if widthLimitedHeight <= availableSize.height {
            return CGSize(width: availableSize.width, height: widthLimitedHeight)
        }

        return CGSize(
            width: availableSize.height * aspectRatio,
            height: availableSize.height
        )
    }
}

private struct FrozenScanImageView: View {
    let data: Data

    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .clipped()
            } else {
                Color.black
            }
        }
        .task(id: data) {
            image = UIImage(data: data)
        }
        .accessibilityHidden(true)
    }
}

#Preview {
    NavigationStack { ScannerView() }
        .environment(PreferencesStore())
        .environment(CollectionStore())
        .environment(EntitlementStore())
}
