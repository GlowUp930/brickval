import UIKit
import SwiftUI

struct ScannerView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(MonetizationStore.self) private var monetization
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.brickValAccent) private var accent
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.openURL) private var openURL
    @State private var store: ScanStore
    @State private var isShowingScanTips = false
    @State private var purchaseMessage: String?
    private let runsCameraLoop: Bool

    init(api: BrickValAPIClient = .live()) {
        let store = ScanStore(api: api)
#if DEBUG
        let isProcessingLayoutDemo = ProcessInfo.processInfo.arguments.contains("-showScannerProcessingLayoutDemo")
        if isProcessingLayoutDemo,
           let imageData = UIImage(named: "AvatarClassic")?.jpegData(compressionQuality: 0.9) {
            store.configureProcessingLayoutDemo(imageData: imageData)
        }
        if ProcessInfo.processInfo.arguments.contains("-showBulkGatingDemo") {
            store.intent = .bulk
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
            Picker("Scan mode", selection: scanIntentBinding) {
                ForEach(ScanIntent.allCases) {
                    Label($0.title, systemImage: $0.iconName).tag($0)
                }
            }
            .pickerStyle(.segmented)
            .controlSize(.large)
            .frame(maxWidth: 340, minHeight: 56)
            .accessibilityIdentifier("scanner.modePicker")
            .padding(.top, 8)
            .padding(.bottom, 4)

            ScannerAllowanceView(
                intent: store.intent,
                policy: monetization.policy,
                usage: monetization.usage,
                isPro: entitlements.isPro
            )
            .frame(height: 32)
            .padding(.bottom, 8)

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
                capture: {
                    dismissScanTips()
                    Task { await store.captureManually() }
                }
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
        .task {
            store.configureMonetization(monetization)
            monetization.configure(signedIn: coordinator?.clerk?.user != nil)
        }
        .task {
            guard !preferences.hasSeenScanTips else { return }
            if !reduceMotion {
                try? await Task.sleep(for: .milliseconds(420))
            }
            guard !Task.isCancelled, !preferences.hasSeenScanTips else { return }
            withAnimation(reduceMotion ? nil : .snappy(duration: 0.28)) {
                isShowingScanTips = true
            }
        }
        .onChange(of: store.phase) { _, phase in
            guard [.capturing, .identifying, .review, .result].contains(phase) else { return }
            dismissScanTips()
        }
        .onChange(of: store.proLimitFeature) { _, feature in
            guard let feature else { return }
            presentLimit(for: feature)
            store.clearProLimitRequest()
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
            if isShowingScanTips {
                ScanTipsCallout(dismiss: dismissScanTips)
                    .padding(.top, 76)
                    .padding(.horizontal, 12)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .zIndex(2)
            }
        }
        .overlay(alignment: .top) {
            if let message = store.successMessage {
                Label(message, systemImage: "checkmark.circle.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.black)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(accent, in: .capsule)
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.easeOut(duration: 0.2), value: store.successMessage)
        .alert("BrickValue Pro", isPresented: purchaseMessageBinding) {
            Button("OK", role: .cancel) { purchaseMessage = nil }
        } message: {
            Text(purchaseMessage ?? "")
        }
    }

    private var scanIntentBinding: Binding<ScanIntent> {
        Binding(
            get: { store.intent },
            set: { intent in
                guard intent == .bulk,
                      !monetization.canUseBulk(isPro: entitlements.isPro)
                else {
                    store.intent = intent
                    return
                }
                presentLimit(for: .bulkScan)
            }
        )
    }

    private var purchaseMessageBinding: Binding<Bool> {
        Binding(
            get: { purchaseMessage != nil },
            set: { if !$0 { purchaseMessage = nil } }
        )
    }

    private func presentLimit(for feature: ProFeature) {
        let placement: ProPlacement = feature == .singleScan ? .scanLimitReached : .bulkScanAttempt
        let presented = coordinator?.presentProFeature(
            placement: placement,
            params: ["remaining": feature == .singleScan ? monetization.usage.singleScan.remaining : monetization.usage.bulkScan.remaining]
        ) {
            if feature == .bulkScan { store.intent = .bulk }
        } ?? false
        if !presented {
            purchaseMessage = "Upgrade options are temporarily unavailable. Try again shortly."
        }
    }

    private func dismissScanTips() {
        guard isShowingScanTips || !preferences.hasSeenScanTips else { return }
        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
            isShowingScanTips = false
        }
        preferences.hasSeenScanTips = true
    }
}

private struct ScannerAllowanceView: View {
    let intent: ScanIntent
    let policy: MonetizationPolicy
    let usage: UsageSnapshot
    let isPro: Bool

    var body: some View {
        HStack(spacing: BrickValStyle.Primitive.space8) {
            if let text {
                Text(text)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.82)
            }
            if showsProBadge {
                ProBadge(state: isPro ? .active : .requiresPro)
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }

    private var text: String? {
        switch intent {
        case .single:
            guard policy.gates.singleDaily else { return nil }
            if isPro { return "Unlimited scans" }
            let remaining = usage.singleScan.remaining
            if remaining == 0 { return "No free scans left today" }
            return "\(remaining) free \(remaining == 1 ? "scan" : "scans") left today"
        case .bulk:
            if isPro { return "Unlimited bulk scans" }
            let remaining = usage.bulkScan.remaining
            return remaining > 0 ? "1 free try" : "Bulk scanning requires Pro"
        }
    }

    private var showsProBadge: Bool {
        intent == .bulk || (intent == .single && policy.gates.singleDaily)
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

private struct ScanTipsCallout: View {
    @Environment(\.brickValAccent) private var accent
    let dismiss: () -> Void

    private let surface = Color(.secondarySystemBackground)

    var body: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
            HStack(alignment: .top, spacing: BrickValStyle.Primitive.space8) {
                Label("Choose your scan mode", systemImage: "sparkles")
                    .font(.headline)
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                Spacer(minLength: 0)
                Button(action: dismiss) {
                    Image(systemName: "xmark")
                        .font(.caption.weight(.bold))
                        .frame(width: 30, height: 30)
                }
                .buttonStyle(.plain)
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                .accessibilityLabel("Dismiss scan tips")
            }

            Text("Two focused ways to find value, depending on what is in front of you.")
                .font(.subheadline)
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            tipRow(
                "person.crop.rectangle",
                title: "Minifigure · one figure",
                detail: "Auto-detection watches for one figure and captures when the frame is ready for a faster result."
            )
            tipRow(
                "square.stack.3d.up",
                title: "Bulk · up to 40 figures",
                detail: "Place multiple figures in one photo, then tap the shutter. We can review up to 40 in one scan."
            )

            Button("Got it", action: dismiss)
                .buttonStyle(.borderedProminent)
                .tint(accent)
                .foregroundStyle(BrickValStyle.Primitive.black)
                .frame(maxWidth: .infinity)
                .accessibilityHint("Dismisses the scan tips")
        }
        .padding(BrickValStyle.Primitive.space16)
        .frame(maxWidth: 340, alignment: .leading)
        .background(surface, in: .rect(cornerRadius: 18))
        .overlay {
            RoundedRectangle(cornerRadius: 18)
                .stroke(BrickValStyle.Semantic.divider, lineWidth: 1)
        }
        .overlay(alignment: .top) {
            Image(systemName: "arrowtriangle.up.fill")
                .font(.system(size: 17))
                .foregroundStyle(surface)
                .offset(y: -8)
        }
        .shadow(color: BrickValStyle.Primitive.black.opacity(0.24), radius: 18, y: 8)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Scan mode tips")
    }

    private func tipRow(_ icon: String, title: String, detail: String) -> some View {
        HStack(alignment: .top, spacing: BrickValStyle.Primitive.space8) {
            Image(systemName: icon)
                .font(.body.weight(.semibold))
                .foregroundStyle(accent)
                .frame(width: 24)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                Text(detail)
                    .font(.footnote)
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

#Preview {
    NavigationStack { ScannerView() }
        .environment(PreferencesStore())
        .environment(CollectionStore())
        .environment(EntitlementStore())
        .environment(MonetizationStore())
}
