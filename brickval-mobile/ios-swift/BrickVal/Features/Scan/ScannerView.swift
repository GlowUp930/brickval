import PhotosUI
import SwiftUI

struct ScannerView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.openURL) private var openURL
    @State private var store: ScanStore
    @State private var photoSelection: PhotosPickerItem?

    init(api: BrickValAPIClient = .live()) {
        _store = State(initialValue: ScanStore(api: api))
    }

    var body: some View {
        @Bindable var store = store
        VStack(spacing: 0) {
            Picker("Scan type", selection: $store.mode) {
                ForEach(ScanMode.allCases) { Text($0.title).tag($0) }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.bottom, 8)

            if store.mode == .minifig {
                Picker("Scan amount", selection: $store.intent) {
                    ForEach(ScanIntent.allCases) { Text($0.title).tag($0) }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.bottom, 8)
            }

            ZStack(alignment: .top) {
                CameraPreview(session: store.captureSession)
                    .background(.black)
                    .clipShape(.rect(cornerRadius: 24))
                ViewfinderOverlayView()
                DetectionOverlayView(observations: store.observations)
                ScannerStatusView(phase: store.phase, smartScanMessage: store.smartScanMessage)
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
                isTorchEnabled: store.isTorchEnabled,
                isBusy: [.capturing, .identifying].contains(store.phase),
                photoSelection: $photoSelection,
                toggleTorch: { Task { await store.toggleTorch() } },
                capture: { Task { await store.captureManually() } },
                openManualLookup: { store.presentedSheet = .manualLookup }
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
        .task(id: photoSelection) {
            guard let data = try? await photoSelection?.loadTransferable(type: Data.self) else { return }
            await store.identifyGalleryImage(data)
            photoSelection = nil
        }
        .task(id: preferences.smartAutoScanEnabled) {
            store.setSmartScanEnabled(preferences.smartAutoScanEnabled)
        }
        .task(id: preferences.scanImprovementConsent) {
            store.setFeedbackConsent(preferences.scanImprovementConsent)
        }
        .sheet(item: $store.presentedSheet) { sheet in
            switch sheet {
            case .manualLookup: ManualLookupView(store: store)
            case .partColor(let detection): PartColorSelectionView(detection: detection, store: store)
            case .bulkResults(let results, let unresolved):
                BulkScanResultsView(results: results, unresolved: unresolved, store: store)
            case .result(let result): ScanResultView(result: result, reset: store.reset)
            case .review(let review): ScanReviewView(review: review, store: store)
            }
        }
    }
}

#Preview {
    NavigationStack { ScannerView() }
        .environment(PreferencesStore())
        .environment(CollectionStore())
        .environment(EntitlementStore())
}
