import UIKit
import SwiftUI

struct ScannerView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.openURL) private var openURL
    @State private var store: ScanStore

    init(api: BrickValAPIClient = .live()) {
        _store = State(initialValue: ScanStore(api: api))
    }

    var body: some View {
        @Bindable var store = store
        VStack(spacing: 0) {
            Picker("Scan mode", selection: $store.intent) {
                ForEach(ScanIntent.allCases) { Text($0.title).tag($0) }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.bottom, 8)

            ZStack {
                ZStack(alignment: .top) {
                    CameraPreview(session: store.captureSession)
                        .background(.black)
                    if let data = store.frozenImageData {
                        FrozenScanImageView(data: data)
                            .transition(.opacity)
                    }
                    if [.capturing, .identifying].contains(store.phase) {
                        ScanProcessingOverlayView(phase: store.phase, intent: store.intent)
                    } else {
                        ViewfinderOverlayView()
                        DetectionOverlayView(observations: store.observations)
                        ScannerStatusView(
                            phase: store.phase,
                            intent: store.intent,
                            smartScanMessage: store.intent == .single ? store.smartScanMessage : nil
                        )
                    }
                }
                .aspectRatio(3.0 / 4.0, contentMode: .fit)
                .clipShape(.rect(cornerRadius: 24))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
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
        }
        .navigationTitle("Scan")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: scenePhase) {
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
        .accessibilityLabel("Captured scan")
    }
}

#Preview {
    NavigationStack { ScannerView() }
        .environment(PreferencesStore())
        .environment(CollectionStore())
        .environment(EntitlementStore())
}
