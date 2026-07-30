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

            ZStack(alignment: .top) {
                CameraPreview(session: store.captureSession)
                    .background(.black)
                    .clipShape(.rect(cornerRadius: 24))
                if let data = store.frozenImageData, let image = UIImage(data: data) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .clipped()
                        .clipShape(.rect(cornerRadius: 24))
                        .transition(.opacity)
                        .accessibilityLabel("Captured bulk scan")
                }
                ViewfinderOverlayView()
                DetectionOverlayView(observations: store.observations)
                ScannerStatusView(
                    phase: store.phase,
                    smartScanMessage: store.intent == .single ? store.smartScanMessage : nil
                )
            }
            .frame(maxHeight: .infinity)
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

#Preview {
    NavigationStack { ScannerView() }
        .environment(PreferencesStore())
        .environment(CollectionStore())
        .environment(EntitlementStore())
}
