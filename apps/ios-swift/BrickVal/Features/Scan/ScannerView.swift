import UIKit
import PhotosUI
import SwiftUI

struct ScannerView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(MonetizationStore.self) private var monetization
    @Environment(NotificationCoordinator.self) private var notifications
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.brickValAccent) private var accent
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.openURL) private var openURL
    @State private var store: ScanStore
    @State private var isShowingScanTips = false
    @State private var selectedBulkPhoto: PhotosPickerItem?
    @State private var isImportingBulkPhoto = false
    @State private var frozenPreview: UIImage?
    @State private var scanOperation: Task<Void, Never>?
    @State private var purchaseMessage: String?
    private let runsCameraLoop: Bool

    init(api: BrickValAPIClient = .live()) {
        let store = ScanStore(api: api)
#if DEBUG
        let isProcessingLayoutDemo = ProcessInfo.processInfo.arguments.contains("-showScannerProcessingLayoutDemo")
        let isWideBulkProcessingLayoutDemo = ProcessInfo.processInfo.arguments.contains("-showWideBulkProcessingLayoutDemo")
        let isBulkRecoveryDemo = ProcessInfo.processInfo.arguments.contains("-showBulkRecoveryDemo")
        let isDenseBulkRecoveryDemo = ProcessInfo.processInfo.arguments.contains("-showDenseBulkRecoveryDemo")
        let isLockedBulkPreviewDemo = ProcessInfo.processInfo.arguments.contains("-showLockedBulkPreviewDemo")
        let isFailedScanDemo = ProcessInfo.processInfo.arguments.contains("-showScannerFailureDemo")
        if isWideBulkProcessingLayoutDemo,
           let imageData = BulkRecoveryDemoFixture.wideProcessingImageData {
            store.configureBulkProcessingLayoutDemo(imageData: imageData)
        } else if isProcessingLayoutDemo,
           let imageData = UIImage(named: "AvatarClassic")?.jpegData(compressionQuality: 0.9) {
            store.configureProcessingLayoutDemo(imageData: imageData)
        } else if isFailedScanDemo,
                  let imageData = UIImage(named: "AvatarClassic")?.jpegData(compressionQuality: 0.9) {
            store.configureFailedScanDemo(imageData: imageData)
        }
        if isBulkRecoveryDemo {
            store.configureBulkRecoveryDemo()
        }
        if isDenseBulkRecoveryDemo {
            store.configureDenseBulkRecoveryDemo()
        }
        if isLockedBulkPreviewDemo {
            store.configureLockedBulkPreviewDemo()
        }
        if ProcessInfo.processInfo.arguments.contains("-showBulkGatingDemo") {
            store.intent = .bulk
        }
        runsCameraLoop = !isProcessingLayoutDemo &&
            !isWideBulkProcessingLayoutDemo &&
            !isBulkRecoveryDemo &&
            !isDenseBulkRecoveryDemo &&
            !isLockedBulkPreviewDemo &&
            !isFailedScanDemo
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
                isPro: entitlements.isPro,
                lockedBulkPreviewAvailable: monetization.shouldUseLockedBulkPreview(isPro: entitlements.isPro),
                notifyWhenReset: {
                    guard let resetDate = monetization.usage.singleScan.resetsAt.flatMap(ISO8601DateFormatter().date(from:)) else { return }
                    Task { await notifications.requestScanResetReminder(resetDate: resetDate) }
                },
                isResetReminderEnabled: notifications.scanResetReminderEnabled
            )
            .padding(.bottom, 8)

            GeometryReader { proxy in
                let cameraSize = ScannerCameraLayout.size(fitting: proxy.size)
                let fullStageRect = CGRect(origin: .zero, size: cameraSize)
                let isBulkProcessing = store.intent == .bulk &&
                    [.capturing, .identifying].contains(store.phase)
                let isFailed: Bool = {
                    if case .failed = store.phase { return true }
                    return false
                }()
                let bulkImageRect: CGRect = {
                    guard store.intent == .bulk,
                          let image = frozenPreview
                    else {
                        return fullStageRect
                    }
                    return BulkImageLayout.aspectFitRect(
                        imageSize: image.size,
                        containerSize: cameraSize
                    )
                }()

                ZStack {
                    ZStack(alignment: .top) {
                        CameraPreview(session: store.captureSession)
                            .background(.black)
                        if store.frozenImageData != nil {
                            FrozenScanImageView(
                                image: frozenPreview,
                                usesAspectFit: store.intent == .bulk
                            )
                                .transition(.opacity)
                        }
                        if ![.capturing, .identifying].contains(store.phase) {
                            if store.intent == .bulk {
                                BulkFocusOverlay(
                                    regions: store.observations.prefix(BulkScanSource.maximumRegionCount).enumerated().map { index, observation in
                                        BulkFocusRegion(
                                            id: observation.id,
                                            box: observation.boundingBox,
                                            number: index + 1,
                                            state: .active
                                        )
                                    },
                                    imageRect: store.intent == .bulk ? bulkImageRect : fullStageRect,
                                    containerSize: cameraSize,
                                    accent: accent
                                )
                            } else {
                                ViewfinderOverlayView()
                                DetectionOverlayView(observations: store.observations)
                            }
                            ScannerStatusView(
                                phase: store.phase,
                                intent: store.intent,
                                smartScanMessage: store.intent == .single ? store.smartScanMessage : nil,
                                retry: {
                                    if store.intent == .bulk, store.frozenImageData != nil {
                                        startScanOperation { await store.retryBulkScan() }
                                    } else {
                                        startScanOperation { await store.retryCamera() }
                                    }
                                }
                            )
                        }
                    }
                    .overlay {
                        if isImportingBulkPhoto && ![.capturing, .identifying].contains(store.phase) {
                            Label("Preparing photo…", systemImage: "photo.on.rectangle")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .background(.regularMaterial, in: .capsule)
                                .accessibilityIdentifier("scanner.bulkPhotoImport")
                        } else if [.capturing, .identifying].contains(store.phase) {
                            if store.intent == .bulk {
                                BulkProcessingOverlayView(
                                    image: frozenPreview,
                                    regions: store.bulkProcessingRegions,
                                    phase: store.phase,
                                    source: store.bulkProcessingSource,
                                    completed: store.bulkProcessingCompleted,
                                    total: store.bulkProcessingTotal
                                )
                            } else {
                                ScanProcessingOverlayView(phase: store.phase, intent: store.intent)
                            }
                        }
                    }
                    .frame(width: cameraSize.width, height: cameraSize.height)
                    .clipped()
                    .accessibilityHidden(!isBulkProcessing && !isFailed)

                    Color.clear
                        .frame(width: cameraSize.width, height: cameraSize.height)
                        .contentShape(Rectangle())
                        .allowsHitTesting(false)
                        .accessibilityElement()
                        .accessibilityLabel(
                            [.capturing, .identifying].contains(store.phase)
                                ? "Captured scan"
                                : "Camera preview"
                        )
                        .accessibilityValue(store.phase.statusText)
                        .accessibilityIdentifier("scanner.cameraStage")
                        .accessibilityHidden(isBulkProcessing || isFailed)
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
                isCameraReady: store.phase.allowsLiveDetection,
                isImportingPhoto: isImportingBulkPhoto,
                bulkPhotoItem: $selectedBulkPhoto,
                toggleTorch: { Task { await store.toggleTorch() } },
                capture: {
                    dismissScanTips()
                    startScanOperation { await store.captureManually() }
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
                scanOperation?.cancel()
                store.cancelBulkScan()
                await store.stopCamera()
            }
        }
        .task(id: store.frozenImageRevision) {
            guard let data = store.frozenImageData else {
                frozenPreview = nil
                return
            }
            frozenPreview = nil
            let image = await ScanPreviewPipeline.shared.image(for: data)
            guard !Task.isCancelled else { return }
            frozenPreview = image
        }
        .task(id: preferences.scanImprovementConsent) {
            store.setFeedbackConsent(preferences.scanImprovementConsent)
        }
        .task {
            store.configureMonetization(monetization, isPro: entitlements.isPro)
            store.configureAnalytics(coordinator?.analytics)
            monetization.configure(signedIn: coordinator?.clerk?.user != nil)
        }
        .onChange(of: entitlements.isPro) { _, isPro in
            store.updateProStatus(isPro)
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
        .task(id: selectedBulkPhoto) {
            guard let item = selectedBulkPhoto else { return }
            store.cancelBulkScan()
            isImportingBulkPhoto = true
            defer {
                isImportingBulkPhoto = false
                selectedBulkPhoto = nil
            }
            do {
                guard let data = try await item.loadTransferable(type: Data.self) else {
                    await store.importBulkPhotoLoadFailed()
                    return
                }
                try Task.checkCancellation()
                await store.importBulkPhoto(data)
            } catch is CancellationError {
                return
            } catch {
                await store.importBulkPhotoLoadFailed()
            }
        }
        .onDisappear {
            scanOperation?.cancel()
            scanOperation = nil
            store.cancelBulkScan()
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
            case .result(let result): ScanResultView(result: result, reset: store.reset)
            case .review(let review): ScanReviewView(review: review, store: store)
            }
        }
        .fullScreenCover(item: $store.presentedBulkResults) { presentation in
            BulkScanResultsView(
                presentation: presentation,
                store: store,
                preview: frozenPreview
            )
        }
        .overlay(alignment: .top) {
            if isShowingScanTips {
                ScanTipsCallout(dismiss: dismissScanTips)
                    .padding(.top, 76)
                    .padding(.horizontal, 12)
                    .transition(reduceMotion ? .opacity : .move(edge: .top).combined(with: .opacity))
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
            purchaseMessage = BrickValLocalization.localized("Upgrade options are temporarily unavailable. Try again shortly.")
        }
    }

    private func dismissScanTips() {
        guard isShowingScanTips || !preferences.hasSeenScanTips else { return }
        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
            isShowingScanTips = false
        }
        preferences.hasSeenScanTips = true
    }

    private func startScanOperation(_ operation: @escaping @MainActor () async -> Void) {
        scanOperation?.cancel()
        scanOperation = Task { @MainActor in
            await operation()
        }
    }
}

private struct ScannerAllowanceView: View {
    let intent: ScanIntent
    let policy: MonetizationPolicy
    let usage: UsageSnapshot
    let isPro: Bool
    let lockedBulkPreviewAvailable: Bool
    let notifyWhenReset: () -> Void
    let isResetReminderEnabled: Bool

    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space4) {
            HStack(spacing: BrickValStyle.Primitive.space8) {
                if let text {
                    if isPro {
                        ProUnlimitedLabel(text: text)
                    } else {
                        Image(systemName: usage.singleScan.remaining == 0 && intent == .single ? "exclamationmark.circle.fill" : "camera.aperture")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(usage.singleScan.remaining == 0 && intent == .single ? BrickValStyle.Semantic.valueNegative : BrickValStyle.Semantic.textSecondary)
                            .accessibilityHidden(true)
                        Text(text)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.82)
                    }
                }
                if showsProBadge {
                    ProBadge(state: isPro ? .active : .requiresPro)
                }
            }

            if intent == .single && !isPro && policy.gates.singleDaily && usage.singleScan.remaining == 0 {
                Button(action: notifyWhenReset) {
                    Label(
                        isResetReminderEnabled ? "Reset reminder set" : "Notify me when scans reset",
                        systemImage: isResetReminderEnabled ? "checkmark" : "bell"
                    )
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                }
                .buttonStyle(.plain)
                .disabled(isResetReminderEnabled)
                .accessibilityHint(isResetReminderEnabled ? "A reminder is already scheduled" : "Requests permission for one reset reminder")
            }
        }
        .padding(.horizontal, BrickValStyle.Primitive.space8)
        .padding(.vertical, BrickValStyle.Primitive.space4)
        .frame(maxWidth: 340, minHeight: 30)
        .background(BrickValStyle.Semantic.surfaceMuted.opacity(0.72), in: Capsule())
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }

    private var text: String? {
        switch intent {
        case .single:
            guard policy.gates.singleDaily else { return nil }
            if isPro { return BrickValLocalization.localized("Unlimited scans") }
            let remaining = usage.singleScan.remaining
            if remaining == 0 { return BrickValLocalization.localized("No free scans left today") }
            return BrickValLocalization.localized("\(remaining) free scan left today")
        case .bulk:
            if isPro { return BrickValLocalization.localized("Unlimited bulk scans") }
            if lockedBulkPreviewAvailable { return BrickValLocalization.localized("Preview available · unlock to value") }
            let remaining = usage.bulkScan.remaining
            return remaining > 0 ? BrickValLocalization.localized("1 free try") : BrickValLocalization.localized("Bulk scanning requires Pro")
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
    let image: UIImage?
    let usesAspectFit: Bool

    var body: some View {
        Group {
            if let image {
                GeometryReader { proxy in
                    let imageRect = usesAspectFit
                        ? BulkImageLayout.aspectFitRect(
                            imageSize: image.size,
                            containerSize: proxy.size
                        )
                        : aspectFillRect(imageSize: image.size, containerSize: proxy.size)
                    Image(uiImage: image)
                        .resizable()
                        .frame(width: imageRect.width, height: imageRect.height)
                        .position(x: imageRect.midX, y: imageRect.midY)
                }
                .background(.black)
                .clipped()
            } else {
                Color.black
            }
        }
        .accessibilityHidden(true)
    }

    private func aspectFillRect(imageSize: CGSize, containerSize: CGSize) -> CGRect {
        guard imageSize.width > 0,
              imageSize.height > 0,
              containerSize.width > 0,
              containerSize.height > 0
        else {
            return CGRect(origin: .zero, size: containerSize)
        }
        let scale = max(
            containerSize.width / imageSize.width,
            containerSize.height / imageSize.height
        )
        let renderedSize = CGSize(
            width: imageSize.width * scale,
            height: imageSize.height * scale
        )
        return CGRect(
            x: (containerSize.width - renderedSize.width) / 2,
            y: (containerSize.height - renderedSize.height) / 2,
            width: renderedSize.width,
            height: renderedSize.height
        )
    }
}

private struct ScanTipsCallout: View {
    @Environment(\.brickValAccent) private var accent
    let dismiss: () -> Void

    private let surface = Color(.secondarySystemBackground)

    var body: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
            HStack(alignment: .center, spacing: BrickValStyle.Primitive.space12) {
                Image(systemName: "viewfinder")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(accent)
                    .frame(width: 40, height: 40)
                    .background(accent.opacity(0.14), in: .rect(cornerRadius: 12))
                    .accessibilityHidden(true)

                Text("Choose your scan mode")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                Spacer(minLength: 0)
                Button(action: dismiss) {
                    Image(systemName: "xmark")
                        .font(.caption.weight(.bold))
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.plain)
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                .accessibilityLabel("Dismiss scan tips")
            }

            Text("Frame up to 60 figures, then tap the shutter")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            Divider()
                .overlay(BrickValStyle.Semantic.divider)

            tipRow(
                1,
                "person.crop.rectangle",
                title: "Minifigure · one figure",
                detail: "Auto-detection watches for one figure and captures when the frame is ready for a faster result."
            )
            tipRow(
                2,
                "square.stack.3d.up",
                title: "Bulk scan",
                detail: "Frame up to 60 figures, then tap the shutter"
            )

            Button("Got it", action: dismiss)
                .buttonStyle(.borderedProminent)
                .tint(accent)
                .foregroundStyle(BrickValStyle.Primitive.black)
                .frame(maxWidth: .infinity, minHeight: 48)
                .accessibilityHint("Dismisses the scan tips")
        }
        .padding(BrickValStyle.Primitive.space16)
        .frame(maxWidth: 350, alignment: .leading)
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
        .accessibilityIdentifier("scanner.quickStartTips")
    }

    private func tipRow(_ number: Int, _ icon: String, title: LocalizedStringResource, detail: LocalizedStringResource) -> some View {
        HStack(alignment: .top, spacing: BrickValStyle.Primitive.space8) {
            ZStack(alignment: .topLeading) {
                Image(systemName: icon)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(accent)
                    .frame(width: 34, height: 34)
                    .background(accent.opacity(0.14), in: .rect(cornerRadius: 10))
                Text("\(number)")
                    .font(.caption2.weight(.bold).monospacedDigit())
                    .foregroundStyle(BrickValStyle.Primitive.black)
                    .frame(width: 17, height: 17)
                    .background(accent, in: .circle)
                    .offset(x: -5, y: -5)
            }
            .frame(width: 34, height: 34)
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
        .environment(CurrencyStore())
}
