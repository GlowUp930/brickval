@preconcurrency import AVFoundation
import Foundation
import Observation
import OSLog

private enum BulkRegionOutcome: Sendable {
    case completed(region: BulkScanRegion, payload: BulkRegionIdentificationPayload)
    case failed(region: BulkScanRegion, error: APIError?)

    var region: BulkScanRegion {
        switch self {
        case .completed(let region, _), .failed(let region, _): region
        }
    }
}

@Observable
@MainActor
final class ScanStore {
    let mode: ScanMode = .minifig
    var intent: ScanIntent = .single {
        didSet {
            guard oldValue != intent else { return }
            resetDetectionState()
            if phase != .preparingCamera { phase = .searching }
        }
    }
    private(set) var phase: ScanPhase = .idle
    private(set) var authorizationStatus: CameraAuthorizationStatus = .notDetermined
    private(set) var observations: [DetectionObservation] = []
    var presentedSheet: ScannerSheet? {
        didSet {
            guard oldValue != nil, presentedSheet == nil else { return }
            returnToLiveScanner()
        }
    }
    var presentedBulkResults: BulkScanPresentation?
    private(set) var smartScanAvailable = true
    private(set) var smartScanMessage: String?
    private(set) var detectorModelVersion: String?
    private(set) var isTorchEnabled = false
    private(set) var frozenImageData: Data?
    /// Changes whenever the captured bytes change so views can request one
    /// shared prepared preview without hashing large image data on the main
    /// thread.
    private(set) var frozenImageRevision = UUID()
    private(set) var bulkProcessingRegions: [NormalizedBoundingBox] = []
    private(set) var bulkProcessingSource: BulkScanSource = .camera
    private(set) var bulkProcessingCompleted = 0
    private(set) var bulkProcessingTotal = 0
    private(set) var successMessage: String?
    private(set) var proLimitFeature: ProFeature?

    @ObservationIgnored private let camera: CameraService
    @ObservationIgnored private let motion: MotionStabilityService
    @ObservationIgnored private let imageProcessor: ImageProcessor
    @ObservationIgnored private let api: BrickValAPIClient
    @ObservationIgnored private let detector: any MinifigureDetecting
    @ObservationIgnored private let bulkFrameDetector: (any BulkFrameDetecting)?
    @ObservationIgnored private let bulkPhotoDetector: any BulkPhotoDetecting
    @ObservationIgnored private let soundEffects: SoundEffectPlayer
    @ObservationIgnored private let errorReporter: any AppErrorReporting
    @ObservationIgnored private var analytics: PostHogAnalytics?
    @ObservationIgnored private var monetization: MonetizationStore?
    @ObservationIgnored private var isProSubscriber = false
    @ObservationIgnored private var frozenBulkRegions: [BulkScanRegion] = []
    @ObservationIgnored private var frozenBulkSource: BulkScanSource = .camera
    @ObservationIgnored private var attemptedProAccessRecovery = false
    @ObservationIgnored private var autoSession = AutoScanSession()
    @ObservationIgnored private var bulkDetectionTracker = BulkDetectionTracker()
    @ObservationIgnored private var schedule = LocalDetectionSchedule()
    @ObservationIgnored private var feedbackConsent = false
    @ObservationIgnored private var detectorDetectionMilliseconds: Int?
    @ObservationIgnored private var autoScanStartedAt: Date?
    @ObservationIgnored private var firstDetectionAt: Date?
    @ObservationIgnored private var bulkScanGeneration = 0
#if DEBUG
    @ObservationIgnored private var retriesWithoutCamera = false
#endif
    @ObservationIgnored private let performanceLogger = Logger(
        subsystem: "com.brickval.app",
        category: "ScanPerformance"
    )

    init(
        camera: CameraService = CameraService(),
        motion: MotionStabilityService = MotionStabilityService(),
        imageProcessor: ImageProcessor = ImageProcessor(),
        api: BrickValAPIClient = .live(),
        detector: any MinifigureDetecting = CoreMLMinifigureDetector(),
        bulkPhotoDetector: (any BulkPhotoDetecting)? = nil,
        onDeviceSmartScanEnabled: Bool = true,
        errorReporter: any AppErrorReporting = SentryAppErrorReporter()
    ) {
        self.camera = camera
        self.motion = motion
        self.imageProcessor = imageProcessor
        self.api = api
        self.detector = detector
        self.bulkFrameDetector = detector as? any BulkFrameDetecting
        self.bulkPhotoDetector = bulkPhotoDetector ?? (detector as? any BulkPhotoDetecting) ?? NoopBulkPhotoDetector()
        self.soundEffects = SoundEffectPlayer()
        self.errorReporter = errorReporter
        smartScanAvailable = onDeviceSmartScanEnabled
        smartScanMessage = onDeviceSmartScanEnabled
            ? nil
            : BrickValLocalization.localized("Automatic scan paused. Tap the shutter to scan manually.")
    }

    var captureSession: AVCaptureSession { camera.sessionBox.session }

    private func setFrozenImageData(_ data: Data?) {
        frozenImageData = data
        frozenImageRevision = UUID()
    }

    private func beginBulkScan() -> Int {
        bulkScanGeneration &+= 1
        return bulkScanGeneration
    }

    /// Invalidates detector and provider work that belongs to a photo that is
    /// no longer visible. The individual provider tasks also check their own
    /// cancellation, so stale responses cannot reopen the results screen.
    func cancelBulkScan() {
        bulkScanGeneration &+= 1
    }

    private func isCurrentBulkScan(_ generation: Int) -> Bool {
        !Task.isCancelled && generation == bulkScanGeneration
    }

    var canUseSmartScan: Bool {
        mode == .minifig &&
            intent == .single &&
            smartScanAvailable &&
            canBeginSingleScan
    }

#if DEBUG
    func configureProcessingLayoutDemo(imageData: Data) {
        authorizationStatus = .authorized
        setFrozenImageData(imageData)
        phase = .identifying
    }

    func configureFailedScanDemo(imageData: Data) {
        authorizationStatus = .authorized
        setFrozenImageData(imageData)
        phase = .failed(BrickValLocalization.localized("No minifigure match was found. Try a closer, brighter photo."))
        retriesWithoutCamera = true
    }

    func configureBulkProcessingLayoutDemo(imageData: Data) {
        intent = .bulk
        authorizationStatus = .authorized
        setFrozenImageData(imageData)
        frozenBulkSource = .photoLibrary
        bulkProcessingRegions = [
            NormalizedBoundingBox(x: 0.02, y: 0.18, width: 0.14, height: 0.55),
            NormalizedBoundingBox(x: 0.42, y: 0.24, width: 0.16, height: 0.48),
            NormalizedBoundingBox(x: 0.84, y: 0.14, width: 0.14, height: 0.58)
        ]
        bulkProcessingSource = .photoLibrary
        bulkProcessingCompleted = 17
        bulkProcessingTotal = 123
        phase = .identifying
    }

    func configureBulkRecoveryDemo() {
        guard let imageData = BulkRecoveryDemoFixture.imageData else { return }
        intent = .bulk
        authorizationStatus = .authorized
        setFrozenImageData(imageData)
        phase = .review
        presentedBulkResults = BulkScanPresentation(
            imageData: imageData,
            items: BulkRecoveryDemoFixture.items,
            unresolvedRegions: BulkRecoveryDemoFixture.unresolvedRegions,
            recoveryToken: "debug-recovery-token",
            source: .camera
        )
    }

    func configureDenseBulkRecoveryDemo() {
        guard let imageData = BulkRecoveryDemoFixture.imageData else { return }
        intent = .bulk
        authorizationStatus = .authorized
        setFrozenImageData(imageData)
        phase = .review
        presentedBulkResults = BulkScanPresentation(
            imageData: imageData,
            items: BulkRecoveryDemoFixture.denseItems,
            unresolvedRegions: [],
            recoveryToken: "debug-dense-recovery-token",
            source: .camera
        )
    }

    func configureLockedBulkPreviewDemo() {
        guard let imageData = BulkRecoveryDemoFixture.imageData else { return }
        let regions = BulkRecoveryDemoFixture.lockedPreviewRegions
        intent = .bulk
        authorizationStatus = .authorized
        setFrozenImageData(imageData)
        frozenBulkRegions = regions
        frozenBulkSource = .camera
        phase = .review
        presentedBulkResults = BulkScanPresentation(
            imageData: imageData,
            regions: regions,
            recoveryToken: nil,
            source: .camera,
            accessMode: .lockedPreview
        )
    }
#endif

    func setFeedbackConsent(_ enabled: Bool) {
        feedbackConsent = enabled
    }

    func configureMonetization(_ monetization: MonetizationStore, isPro: Bool) {
        self.monetization = monetization
        isProSubscriber = isPro
    }

    func configureAnalytics(_ analytics: PostHogAnalytics?) {
        self.analytics = analytics
    }

    func updateProStatus(_ isPro: Bool) {
        isProSubscriber = isPro
    }

    func clearProLimitRequest() {
        proLimitFeature = nil
    }

    func runCameraLoop() async {
        phase = .preparingCamera
        authorizationStatus = await camera.authorizationStatus()
        if authorizationStatus == .notDetermined {
            let granted = await camera.requestAuthorization()
            authorizationStatus = granted ? .authorized : .denied
        }
        guard authorizationStatus == .authorized else {
            phase = .failed(CameraError.permissionDenied.localizedDescription)
            return
        }

        do {
            try await camera.start()
            await motion.start()
            autoScanStartedAt = .now
            phase = .searching
            while !Task.isCancelled {
                try await Task.sleep(for: .milliseconds(50))
                guard phase.allowsLiveDetection else { continue }
                if canUseSmartScan || (intent == .bulk && smartScanAvailable) {
                    await processLatestFrame()
                }
            }
        } catch is CancellationError {
            // View lifecycle cancellation is expected.
        } catch {
            phase = .failed(error.localizedDescription)
        }
        await stopCamera()
    }

    func stopCamera() async {
        await camera.stop()
        await motion.stop()
        isTorchEnabled = false
    }

    func retryCamera() async {
        guard case .failed = phase else { return }
        let cameraIsRunning = await camera.isRunning()
        setFrozenImageData(nil)
        frozenBulkRegions = []
        resetDetectionState()
#if DEBUG
        if retriesWithoutCamera {
            phase = .searching
            return
        }
#endif
        if cameraIsRunning {
            phase = .searching
        } else {
            await runCameraLoop()
        }
    }

    func toggleTorch() async {
        do {
            try await camera.setTorch(enabled: !isTorchEnabled)
            isTorchEnabled.toggle()
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    func captureManually() async {
        guard phase.allowsLiveDetection else { return }
        guard canBeginCurrentScan else {
            proLimitFeature = intent == .bulk ? .bulkScan : .singleScan
            analytics?.capture(
                PostHogEvent.scanBlocked,
                properties: ["scan_type": intent.rawValue, "source": "camera"]
            )
            return
        }
        analytics?.capture(
            PostHogEvent.scanStarted,
            properties: [
                "scan_type": intent.rawValue,
                "source": "camera",
                "capture_mode": "manual",
            ]
        )
        do {
            phase = .capturing
            let bulkGeneration = intent == .bulk ? beginBulkScan() : nil
            let captureStartedAt = Date.now
            let capture: (data: Data, regions: [BulkScanRegion])
            if intent == .bulk {
                let frame = try await camera.latestFrame()
                let regions = freshBulkRegions(for: frame.timestamp)
                capture = (try await camera.jpegData(for: frame), regions)
            } else {
                capture = (try await camera.captureFrame(), [])
            }
            let data = capture.data
            setFrozenImageData(data)
            frozenBulkRegions = capture.regions
            frozenBulkSource = .camera
            bulkProcessingRegions = capture.regions.map(\.boundingBox)
            bulkProcessingSource = .camera
            bulkProcessingCompleted = 0
            bulkProcessingTotal = capture.regions.count
            attemptedProAccessRecovery = false
            logCaptureDuration(since: captureStartedAt, automatic: false)
            try await identify(
                imageData: data,
                bulkRegions: capture.regions,
                bulkGeneration: bulkGeneration
            )
        } catch {
            if Task.isCancelled { return }
            await handleIdentificationError(error)
        }
    }

    func importBulkPhoto(_ data: Data?) async {
        guard intent == .bulk, phase != .capturing, phase != .identifying else { return }
        guard canBeginCurrentScan else {
            phase = .failed(BrickValLocalization.localized("You've used all available bulk scans. Upgrade to continue."))
            proLimitFeature = .bulkScan
            analytics?.capture(
                PostHogEvent.scanBlocked,
                properties: ["scan_type": ScanIntent.bulk.rawValue, "source": "photo_library"]
            )
            return
        }
        analytics?.capture(
            PostHogEvent.scanStarted,
            properties: [
                "scan_type": ScanIntent.bulk.rawValue,
                "source": "photo_library",
                "capture_mode": "import",
            ]
        )
        guard let data else {
            phase = .failed(BrickValLocalization.localized("We couldn't read that photo. Choose another image and try again."))
            analytics?.capture(
                PostHogEvent.scanFailed,
                properties: ["scan_type": ScanIntent.bulk.rawValue, "source": "photo_library"]
            )
            return
        }

        let generation = beginBulkScan()
        do {
            guard isCurrentBulkScan(generation) else { throw CancellationError() }
            phase = .capturing
            let captureStartedAt = Date.now
            setFrozenImageData(data)
            frozenBulkSource = .photoLibrary
            let detection = try await bulkPhotoDetector.detectBulkRegions(
                in: data,
                limit: BulkScanSource.maximumRegionCount
            )
            guard isCurrentBulkScan(generation) else { throw CancellationError() }
            frozenBulkRegions = detection.regions
            bulkProcessingRegions = detection.regions.map(\.boundingBox)
            bulkProcessingSource = .photoLibrary
            bulkProcessingCompleted = 0
            bulkProcessingTotal = detection.regions.count
            detectorModelVersion = detection.modelVersion
            detectorDetectionMilliseconds = detection.inferenceMilliseconds
            attemptedProAccessRecovery = false
            logCaptureDuration(since: captureStartedAt, automatic: false)
            try await identify(
                imageData: data,
                bulkRegions: detection.regions,
                bulkSource: .photoLibrary,
                bulkGeneration: generation
            )
        } catch {
            guard isCurrentBulkScan(generation) else { return }
            await handleIdentificationError(error)
        }
    }

    func importBulkPhotoLoadFailed() async {
        guard intent == .bulk else { return }
        phase = .failed(BrickValLocalization.localized("We couldn't load that photo. Check your Photos permission and choose another image."))
        analytics?.capture(
            PostHogEvent.scanFailed,
            properties: ["scan_type": ScanIntent.bulk.rawValue, "source": "photo_library"]
        )
    }

    func retryBulkScan() async {
        guard intent == .bulk, case .failed = phase, let frozenImageData else { return }
        let generation = beginBulkScan()
        attemptedProAccessRecovery = false
        do {
            guard isCurrentBulkScan(generation) else { throw CancellationError() }
            try await identify(
                imageData: frozenImageData,
                bulkRegions: frozenBulkRegions,
                bulkSource: frozenBulkSource,
                bulkGeneration: generation
            )
        } catch {
            guard isCurrentBulkScan(generation) else { return }
            await handleIdentificationError(error)
        }
    }

    func identifyGalleryImage(_ data: Data) async {
        guard phase != .identifying else { return }
        guard canBeginSingleScan else {
            proLimitFeature = .singleScan
            return
        }
        do {
            try await identify(imageData: data)
        } catch {
            await handleIdentificationError(error)
        }
    }

    func manualLookup(identifier: String, type: ItemType, colorID: Int?) async throws {
        analytics?.capture(
            PostHogEvent.manualLookupStarted,
            properties: ["item_type": type.rawValue]
        )
        phase = .identifying
        let result = try await api.lookup(identifier, type, colorID)
        phase = .result
        presentedSheet = .result(result)
        soundEffects.play(.cashRegister)
        analytics?.capture(
            PostHogEvent.manualLookupCompleted,
            properties: ["item_type": type.rawValue]
        )
    }

    func selectDetection(_ detection: IdentificationDetection) async {
        if detection.itemType == .part {
            phase = .review
            presentedSheet = .partColor(detection)
            return
        }
        do {
            let result = try await api.lookup(detection.id, detection.itemType, nil)
            phase = .result
            presentedSheet = .result(result)
            soundEffects.play(.cashRegister)
            analytics?.capture(
                PostHogEvent.scanCompleted,
                properties: ["scan_type": intent.rawValue, "outcome": "matched"]
            )
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    func loadReviewCandidates(
        _ candidates: [ScanReviewCandidate]
    ) async throws -> [ScanReviewCandidate] {
        let response = try await api.bulkLookupMinifigures(candidates.map(\.identifier), .review)
        return ScanReviewCandidate.applying(response.rows, to: candidates)
    }

    func selectReviewCandidate(_ candidate: ScanReviewCandidate) async {
        do {
            phase = .identifying
            let result: LookupResult
            if let loadedResult = candidate.result {
                result = loadedResult
            } else {
                result = try await api.lookup(candidate.identifier, .minifig, nil)
            }
            phase = .result
            presentedSheet = .result(result)
            soundEffects.play(.cashRegister)
            analytics?.capture(
                PostHogEvent.scanCompleted,
                properties: ["scan_type": intent.rawValue, "outcome": "matched"]
            )
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    func recoverBulkMinifigure(
        imageData: Data,
        focusBox: NormalizedBoundingBox,
        recoveryToken: String
    ) async throws -> [BulkScanReviewCandidate] {
        let image = try await imageProcessor.bulkRecoveryImage(from: imageData, focusBox: focusBox)
        let response = try await api.recoverBulkMinifigure(image, recoveryToken)
        return response.candidates.map(\.normalized)
    }

    func playBulkRevealSound() {
        soundEffects.play(.cashRegister)
    }

    /// Recovers selected physical figures with a small concurrency window so
    /// recognition stays responsive without flooding the provider.
    func recoverBulkMinifigures(
        imageData: Data,
        selections: [BulkRecoverySelection],
        recoveryToken: String,
        onProgress: @escaping @MainActor @Sendable (Int, Int) -> Void
    ) async -> [BulkRecoveryOutcome] {
        let processor = imageProcessor
        let api = api
        let total = min(selections.count, BulkRecoverySession.maximumSelections)
        let pendingSelections = Array(selections.prefix(total))

        var outcomes: [BulkRecoveryOutcome] = []
        await withTaskGroup(of: BulkRecoveryOutcome.self) { group in
            var nextIndex = 0
            var inFlight = 0

            while nextIndex < pendingSelections.count || inFlight > 0 {
                while nextIndex < pendingSelections.count && inFlight < 2 {
                    let selection = pendingSelections[nextIndex]
                    nextIndex += 1
                    inFlight += 1
                    group.addTask {
                        do {
                            let image = try await processor.bulkRecoveryImage(
                                from: imageData,
                                focusBox: selection.focusBox
                            )
                            let response = try await api.recoverBulkMinifigure(image, recoveryToken)
                            let candidates = response.candidates.map(\.normalized)
                            if candidates.isEmpty {
                                return .skipped(selection: selection, failure: .noMatch)
                            }
                            return .matched(selection: selection, candidates: Array(candidates.prefix(3)))
                        } catch is CancellationError {
                            return .skipped(selection: selection, failure: .unavailable)
                        } catch let error as APIError where error.statusCode == 401 {
                            return .skipped(selection: selection, failure: .expired)
                        } catch {
                            return .skipped(selection: selection, failure: .unavailable)
                        }
                    }
                }

                if let outcome = await group.next() {
                    outcomes.append(outcome)
                    inFlight -= 1
                    onProgress(outcomes.count, total)
                }
            }
        }

        return outcomes.sorted { $0.selection.order < $1.selection.order }
    }

    func loadPartColors() async throws -> [PartColorOption] {
        try await api.partColors()
    }

    func selectPartColor(_ color: PartColorOption, for detection: IdentificationDetection) async {
        do {
            phase = .identifying
            let result = try await api.lookup(detection.id, .part, color.colorID)
            phase = .result
            presentedSheet = .result(result)
            soundEffects.play(.cashRegister)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    func reset() {
        if presentedBulkResults != nil {
            presentedBulkResults = nil
            returnToLiveScanner()
            return
        }
        guard presentedSheet == nil else {
            presentedSheet = nil
            return
        }
        returnToLiveScanner()
    }

    private func returnToLiveScanner() {
        setFrozenImageData(nil)
        frozenBulkRegions = []
        frozenBulkSource = .camera
        bulkProcessingRegions = []
        bulkProcessingSource = .camera
        bulkProcessingCompleted = 0
        bulkProcessingTotal = 0
        attemptedProAccessRecovery = false
        phase = .searching
        resetDetectionState()
    }

    func completeBulkSave(count: Int) {
        reset()
        let message = BrickValLocalization.localized("Added \(count) item to your collection")
        successMessage = message
        Task {
            try? await Task.sleep(for: .seconds(2.4))
            if successMessage == message { successMessage = nil }
        }
    }

    private func processLatestFrame() async {
        do {
            let frame = try await camera.latestFrame()
            let now = Date.now
            guard schedule.shouldProcess(frameTimestamp: frame.timestamp, now: now) else { return }
            schedule.didStart(frameTimestamp: frame.timestamp, now: now)
            defer { schedule.didFinish() }

            let deviceStable = await motion.isStable()
            let batch: MinifigureDetectionBatch
            if intent == .bulk, let bulkFrameDetector {
                batch = try await bulkFrameDetector.detectBulk(in: frame)
            } else {
                batch = try await detector.detect(in: frame)
            }
            detectorModelVersion = batch.modelVersion
            detectorDetectionMilliseconds = batch.inferenceMilliseconds
            if intent == .bulk {
                guard phase == .searching else { return }
                bulkDetectionTracker.ingest(batch.observations, at: frame.timestamp)
                observations = Array(bulkDetectionTracker.observations(for: frame.timestamp).prefix(BulkScanSource.maximumRegionCount))
                phase = .searching
                return
            }
            guard intent == .single else { return }
            observations = batch.observations
            logDetection(batch, at: now)
            autoSession.observe(batch.observations, deviceStable: deviceStable)
            phase = autoSession.captureRequested ? .capturing : autoSession.phase == .searching ? .searching : .holding

            guard autoSession.captureRequested, let focusBox = autoSession.lastObservation?.boundingBox else {
                return
            }
            await captureAutomatically(frame: frame, focusBox: focusBox)
        } catch is CancellationError {
            return
        } catch CameraError.frameUnavailable {
            return
        } catch {
            disableSmartScan(message: BrickValLocalization.localized("Automatic scanning paused because the on-device detector could not start."))
        }
    }

    private func captureAutomatically(
        frame: CameraFrame,
        focusBox: NormalizedBoundingBox
    ) async {
        guard canBeginSingleScan else {
            proLimitFeature = .singleScan
            resetDetectionState()
            phase = .searching
            return
        }
        analytics?.capture(
            PostHogEvent.scanStarted,
            properties: [
                "scan_type": ScanIntent.single.rawValue,
                "source": "camera",
                "capture_mode": "automatic",
            ]
        )
        do {
            let captureStartedAt = Date.now
            let data = try await camera.jpegData(for: frame)
            setFrozenImageData(data)
            frozenBulkRegions = []
            attemptedProAccessRecovery = false
            logCaptureDuration(since: captureStartedAt, automatic: true)
            try await identify(imageData: data, focusBox: focusBox)
        } catch is CancellationError {
            return
        } catch {
            await handleIdentificationError(error)
        }
    }

    private func identify(
        imageData: Data,
        focusBox: NormalizedBoundingBox? = nil,
        bulkRegions: [BulkScanRegion] = [],
        bulkSource: BulkScanSource = .camera,
        bulkGeneration: Int? = nil
    ) async throws {
        let startedAt = Date.now
        if let bulkGeneration {
            guard isCurrentBulkScan(bulkGeneration) else { throw CancellationError() }
        }
        phase = .identifying
        // Capture/import paths publish the bytes before entering identify. A
        // retry reuses those bytes, so do not bump the preview revision again.
        if frozenImageData == nil {
            setFrozenImageData(imageData)
        }
        if mode == .minifig, intent == .bulk {
            if let monetization,
               monetization.shouldUseLockedBulkPreview(isPro: isProSubscriber) {
                guard try await presentLockedBulkPreview(
                    imageData: imageData,
                    bulkRegions: bulkRegions,
                    bulkSource: bulkSource
                ) else {
                    phase = .failed(BrickValLocalization.localized("No minifigures were found. Try a brighter photo with the figures separated and facing forward."))
                    analytics?.capture(
                        PostHogEvent.bulkPreviewCompleted,
                        properties: [
                            "source": bulkSource == .photoLibrary ? "photo_library" : "camera",
                            "detected_count": 0,
                            "outcome": "empty",
                        ]
                    )
                    return
                }
                if let bulkGeneration {
                    guard isCurrentBulkScan(bulkGeneration) else { throw CancellationError() }
                }
                return
            }

            let image = try await imageProcessor.bulkScanImage(from: imageData)
            if let bulkGeneration {
                guard isCurrentBulkScan(bulkGeneration) else { throw CancellationError() }
            }

            // New builds use the session contract when the local detector has
            // supplied physical regions. An empty region list intentionally
            // falls back to the compatibility endpoint so older camera frames
            // can still use the provider's global detector.
            if !bulkRegions.isEmpty,
               let startBulkScan = api.startBulkScan,
               api.identifyBulkRegion != nil {
                let start = try await startBulkScan(image, bulkRegions, bulkSource)
                if let bulkGeneration {
                    guard isCurrentBulkScan(bulkGeneration) else { throw CancellationError() }
                }
                let regions = Array(start.regions.prefix(BulkScanSource.maximumRegionCount))
                guard !regions.isEmpty else {
                    phase = .failed(BrickValLocalization.localized("No minifigures were found. Try a brighter photo with the figures separated and facing forward."))
                    return
                }
                guard let frozenImageData else {
                    phase = .failed(BrickValLocalization.localized("The captured photo is no longer available. Please retake the photo."))
                    return
                }
                bulkProcessingCompleted = 0
                bulkProcessingTotal = regions.count
                phase = .review
                presentedBulkResults = BulkScanPresentation(
                    imageData: frozenImageData,
                    regions: regions,
                    recoveryToken: start.recoveryToken,
                    source: bulkSource,
                    sessionToken: start.sessionToken
                )
                analytics?.capture(
                    PostHogEvent.scanCompleted,
                    properties: [
                        "scan_type": ScanIntent.bulk.rawValue,
                        "source": bulkSource == .photoLibrary ? "photo_library" : "camera",
                        "outcome": "results_ready",
                    ]
                )
                return
            }

            bulkProcessingCompleted = 0
            bulkProcessingTotal = 0
            let response = try await api.scanBulkMinifigures(image, bulkRegions, bulkSource)
            if let bulkGeneration {
                guard isCurrentBulkScan(bulkGeneration) else { throw CancellationError() }
            }
            let items = response.items.map(\.normalized) + response.reviewItems.compactMap(\.bestResultItem)
            guard let frozenImageData,
                  !items.isEmpty || !response.reviewItems.isEmpty || !response.unresolvedRegions.isEmpty
            else {
                self.setFrozenImageData(nil)
                phase = .failed(BrickValLocalization.localized("No priced minifigures were found. Try a brighter photo with the figures separated and facing forward."))
                return
            }
            monetization?.recordSuccessfulBulk(serverUsage: response.usage)
            phase = .review
            presentedBulkResults = BulkScanPresentation(
                imageData: frozenImageData,
                items: items,
                unresolvedRegions: response.unresolvedRegions.map(\.boundingBox),
                recoveryToken: response.recoveryToken,
                source: bulkSource
            )
            logBulkResult(response, startedAt: startedAt)
            analytics?.capture(
                PostHogEvent.scanCompleted,
                properties: [
                    "scan_type": ScanIntent.bulk.rawValue,
                    "source": bulkSource == .photoLibrary ? "photo_library" : "camera",
                    "outcome": "results_ready",
                    "result_count": items.count,
                ]
            )
            return
        }

        let image = try await imageProcessor.finalScanImage(from: imageData, focusBox: focusBox)
        if mode == .minifig, intent == .single {
            switch try await api.scanMinifigure(image) {
            case .matched(let identification, let lookup, let timings, let usage):
                monetization?.recordSuccessfulSingle(serverUsage: usage)
                phase = .result
                presentedSheet = .result(lookup)
                soundEffects.play(.cashRegister)
                logResultTimings(timings, startedAt: startedAt)
                submitFeedback(
                    outcome: .matched,
                    image: image,
                    brickognizeID: identification.id,
                    brickognizeScore: identification.score,
                    startedAt: startedAt,
                    timings: timings
                )
                analytics?.capture(
                    PostHogEvent.scanCompleted,
                    properties: ["scan_type": ScanIntent.single.rawValue, "outcome": "matched"]
                )
            case .review(let detections, let timings, let usage):
                let candidates = ScanReviewCandidate.make(from: detections)
                guard !candidates.isEmpty else {
                    phase = .failed(BrickValLocalization.localized("No minifigure match was found. Try a closer, brighter photo."))
                    logResultTimings(timings, startedAt: startedAt)
                    submitFeedback(
                        outcome: .brickognizeRejected,
                        image: image,
                        brickognizeID: detections.first?.id,
                        brickognizeScore: detections.first?.score,
                        startedAt: startedAt,
                        timings: timings
                    )
                    return
                }
                monetization?.recordSuccessfulSingle(serverUsage: usage)
                phase = .review
                presentedSheet = .review(ScanReview(candidates: candidates))
                logResultTimings(timings, startedAt: startedAt)
                submitFeedback(
                    outcome: .lowConfidence,
                    image: image,
                    brickognizeID: detections.first?.id,
                    brickognizeScore: detections.first?.score,
                    startedAt: startedAt,
                    timings: timings
                )
                analytics?.capture(
                    PostHogEvent.scanCompleted,
                    properties: ["scan_type": ScanIntent.single.rawValue, "outcome": "needs_review"]
                )
            case .notFound(let timings):
                phase = .failed(BrickValLocalization.localized("No minifigure match was found. Try a closer, brighter photo."))
                logResultTimings(timings, startedAt: startedAt)
                submitFeedback(
                    outcome: .brickognizeRejected,
                    image: image,
                    brickognizeID: nil,
                    brickognizeScore: nil,
                    startedAt: startedAt,
                    timings: timings
                )
            }
            return
        }

        let identification = try await api.identify(image, mode, intent)
        guard !identification.detections.isEmpty || identification.setNumber != nil else {
            phase = .failed(BrickValLocalization.localized("No match was found. Try a clearer photo."))
            return
        }

        let identifier = identification.setNumber ?? identification.detections.first?.id
        guard let identifier else {
            phase = .failed(BrickValLocalization.localized("The item could not be identified."))
            return
        }
        let result = try await api.lookup(identifier, mode == .set ? .set : .minifig, nil)
        phase = .result
        presentedSheet = .result(result)
        soundEffects.play(.cashRegister)
        analytics?.capture(
            PostHogEvent.scanCompleted,
            properties: ["scan_type": intent.rawValue, "outcome": "matched"]
        )
    }

    private func presentLockedBulkPreview(
        imageData: Data,
        bulkRegions: [BulkScanRegion],
        bulkSource: BulkScanSource
    ) async throws -> Bool {
        var previewRegions = Array(bulkRegions.prefix(BulkScanSource.maximumRegionCount))
        if previewRegions.isEmpty {
            let detection = try await bulkPhotoDetector.detectBulkRegions(
                in: imageData,
                limit: BulkScanSource.maximumRegionCount
            )
            previewRegions = Array(detection.regions.prefix(BulkScanSource.maximumRegionCount))
            detectorModelVersion = detection.modelVersion
            detectorDetectionMilliseconds = detection.inferenceMilliseconds
        }
        guard !previewRegions.isEmpty else { return false }

        frozenBulkRegions = previewRegions
        frozenBulkSource = bulkSource
        bulkProcessingRegions = previewRegions.map(\.boundingBox)
        bulkProcessingSource = bulkSource
        bulkProcessingCompleted = 0
        bulkProcessingTotal = previewRegions.count
        phase = .review
        presentedBulkResults = BulkScanPresentation(
            imageData: imageData,
            regions: previewRegions,
            recoveryToken: nil,
            source: bulkSource,
            accessMode: .lockedPreview
        )
        analytics?.capture(
            PostHogEvent.bulkPreviewStarted,
            properties: [
                "source": bulkSource == .photoLibrary ? "photo_library" : "camera",
                "detected_count": previewRegions.count,
            ]
        )
        return true
    }

    /// Resolves bulk regions in a bounded window while the results screen is visible.
    /// The view owns the task lifecycle, so dismissing the screen cancels this work.
    func processBulkPresentation(_ presentation: BulkScanPresentation) async {
        guard presentation.accessMode == .real,
              presentedBulkResults?.id == presentation.id,
              let identifyBulkRegion = api.identifyBulkRegion,
              let sessionToken = presentation.sessionToken
        else { return }

        let processor = imageProcessor
        let imageData = presentation.imageData
        var usage: UsageSnapshot?
        var nextIndex = 0
        var inFlight = 0
        var sawProLimit = false

        await withTaskGroup(of: BulkRegionOutcome.self) { group in
            while nextIndex < presentation.regions.count || inFlight > 0 {
                guard !Task.isCancelled,
                      presentedBulkResults?.id == presentation.id,
                      presentation.accessMode == .real
                else {
                    group.cancelAll()
                    return
                }

                while nextIndex < presentation.regions.count && inFlight < 4 {
                    let region = presentation.regions[nextIndex]
                    nextIndex += 1
                    inFlight += 1
                    presentation.markLoading(region.regionId)
                    group.addTask {
                        do {
                            try Task.checkCancellation()
                            let crop = try await processor.bulkRegionImage(
                                from: imageData,
                                region: region.boundingBox,
                                contextRatio: 0.25
                            )
                            let first = try await identifyBulkRegion(crop, region.regionId, sessionToken)
                            let payload = try await Self.retryWeakBulkRegion(
                                first: first,
                                imageData: imageData,
                                region: region,
                                processor: processor,
                                sessionToken: sessionToken,
                                identifyBulkRegion: identifyBulkRegion
                            )
                            return .completed(region: region, payload: payload)
                        } catch is CancellationError {
                            return .failed(region: region, error: nil)
                        } catch let error as APIError {
                            return .failed(region: region, error: error)
                        } catch {
                            return .failed(region: region, error: nil)
                        }
                    }
                }

                guard let outcome = await group.next() else { continue }
                inFlight -= 1
                bulkProcessingCompleted += 1

                switch outcome {
                case .completed(let region, let payload):
                    usage = usage ?? payload.usage
                    guard payload.status != .unresolved,
                          let candidate = payload.bestCandidate
                    else {
                        presentation.markUnresolved(
                            region.regionId,
                            candidates: payload.candidates.map(\.normalized)
                        )
                        continue
                    }
                    let result = candidate.result.normalized
                    presentation.markResolved(BulkScanResultItem(
                        id: region.regionId,
                        result: result,
                        boundingBox: region.boundingBox,
                        confidence: candidate.score,
                        candidates: payload.candidates.map(\.normalized)
                    ))
                case .failed(let region, let error):
                    if let error {
                        usage = usage ?? error.usage
                        sawProLimit = sawProLimit || (
                            error.isProLimit && error.feature == .bulkScan
                        )
                    }
                    presentation.markUnresolved(region.regionId)
                }
            }
        }

        guard !Task.isCancelled,
              presentedBulkResults?.id == presentation.id
        else { return }

        if sawProLimit {
            monetization?.applyServerUsage(usage)
            if !isProSubscriber,
               monetization?.shouldUseLockedBulkPreview(isPro: false, serverLimit: true) == true {
                presentation.enterLockedPreview()
                bulkProcessingCompleted = 0
                bulkProcessingTotal = presentation.regions.count
                analytics?.capture(
                    PostHogEvent.bulkPreviewStarted,
                    properties: [
                        "source": presentation.source == .photoLibrary ? "photo_library" : "camera",
                        "detected_count": presentation.regions.count,
                        "trigger": "server_limit",
                    ]
                )
            } else {
                presentation.terminalError = BrickValLocalization.localized("You've reached the bulk scan limit. Upgrade to continue.")
                proLimitFeature = .bulkScan
            }
        } else if presentation.successfulCount == 0 {
            presentation.terminalError = BrickValLocalization.localized("We couldn't identify any figures. Try a brighter photo with the figures separated and facing forward.")
        } else {
            monetization?.recordSuccessfulBulk(serverUsage: usage)
            if monetization?.isSignedIn == true,
               let referralStatus = try? await api.referralStatus() {
                monetization?.applyReferralStatus(referralStatus)
            }
        }
    }

    nonisolated private static func retryWeakBulkRegion(
        first: BulkRegionIdentificationPayload,
        imageData: Data,
        region: BulkScanRegion,
        processor: ImageProcessor,
        sessionToken: String,
        identifyBulkRegion: @escaping @Sendable (Data, String, String) async throws -> BulkRegionIdentificationPayload
    ) async throws -> BulkRegionIdentificationPayload {
        let score = first.candidates.first?.score ?? 0
        guard first.status != .matched || score < 0.60 else { return first }

        do {
            let widerCrop = try await processor.bulkRegionImage(
                from: imageData,
                region: region.boundingBox,
                contextRatio: 0.40
            )
            return try await identifyBulkRegion(widerCrop, region.regionId, sessionToken)
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            return first
        }
    }

    private func disableSmartScan(message: String) {
        smartScanAvailable = false
        smartScanMessage = BrickValLocalization.localized("\(message) Tap the shutter to scan manually.")
        resetDetectionState()
        phase = .searching
    }

    private func handleIdentificationError(_ error: Error) async {
        if error is CancellationError { return }
        if let apiError = error as? APIError, apiError.isProLimit {
            if isProSubscriber {
                reportScanError(error, statusCode: apiError.statusCode)
                if await attemptProAccessRecovery(), let frozenImageData {
                    do {
                        try await identify(
                            imageData: frozenImageData,
                            bulkRegions: frozenBulkRegions,
                            bulkSource: frozenBulkSource
                        )
                        return
                    } catch {
                        phase = .failed(BrickValLocalization.localized("We couldn't verify Pro access. Check your connection and try again."))
                        return
                    }
                }
                phase = .failed(BrickValLocalization.localized("We couldn't verify Pro access. Check your connection and try again."))
                return
            }

            monetization?.applyServerUsage(apiError.usage)
            if apiError.feature == .bulkScan,
               monetization?.shouldUseLockedBulkPreview(isPro: false, serverLimit: true) == true,
               let frozenImageData {
                do {
                    if try await presentLockedBulkPreview(
                        imageData: frozenImageData,
                        bulkRegions: frozenBulkRegions,
                        bulkSource: frozenBulkSource
                    ) {
                        return
                    }
                    phase = .failed(BrickValLocalization.localized("No minifigures were found. Try a brighter photo with the figures separated and facing forward."))
                    analytics?.capture(
                        PostHogEvent.bulkPreviewCompleted,
                        properties: [
                            "source": frozenBulkSource == .photoLibrary ? "photo_library" : "camera",
                            "detected_count": 0,
                            "outcome": "empty",
                        ]
                    )
                    return
                } catch {
                    // Preserve the server-limit state when local detection cannot rebuild the preview.
                }
            }
            proLimitFeature = apiError.feature
            phase = .failed(apiError.localizedDescription)
            analytics?.capture(
                PostHogEvent.scanBlocked,
                properties: [
                    "scan_type": intent.rawValue,
                    "status_code": apiError.statusCode,
                ]
            )
            return
        }

        let statusCode = (error as? APIError)?.statusCode ?? 0
        reportScanError(error, statusCode: statusCode)
        phase = .failed(error.localizedDescription)
        analytics?.capture(
            PostHogEvent.scanFailed,
            properties: ["scan_type": intent.rawValue, "status_code": statusCode]
        )
    }

    private func reportScanError(_ error: Error, statusCode: Int) {
        guard !(error is CameraError) else { return }
        guard statusCode != 401, statusCode != 402 else { return }
        let context = AppErrorContext(
            endpoint: intent == .bulk ? "bulk minifig scan" : "minifig scan",
            statusCode: statusCode,
            scanSource: intent == .bulk ? frozenBulkSource : .camera,
            regionCount: intent == .bulk ? frozenBulkRegions.count : 0,
            appVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown",
            appBuild: Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "unknown"
        )
        errorReporter.capture(error: error, context: context)
    }

    func attemptProAccessRecovery() async -> Bool {
        guard !attemptedProAccessRecovery else { return false }
        attemptedProAccessRecovery = true
        guard let result = try? await api.syncSubscription(),
              result.verified,
              result.isPro else {
            return false
        }
        isProSubscriber = true
        return true
    }

    private var canBeginSingleScan: Bool {
        intent != .single || monetization?.canUseSingle(isPro: isProSubscriber) != false
    }

    private var canBeginCurrentScan: Bool {
        intent == .bulk
            ? monetization?.canUseBulk(isPro: isProSubscriber) != false
            : canBeginSingleScan
    }

    private func resetDetectionState() {
        observations = []
        autoSession = AutoScanSession()
        bulkDetectionTracker.reset()
        schedule = LocalDetectionSchedule(framesPerSecond: intent == .bulk ? 3 : 6)
        detectorDetectionMilliseconds = nil
        autoScanStartedAt = .now
        firstDetectionAt = nil
    }

    private func submitFeedback(
        outcome: MinifigFeedback.Outcome,
        image: Data,
        brickognizeID: String?,
        brickognizeScore: Double?,
        startedAt: Date,
        timings: MinifigScanTimings
    ) {
        guard feedbackConsent else { return }
        let feedback = MinifigFeedback(
            outcome: outcome,
            consent: feedbackConsent,
            imageData: image,
            detectorModelVersion: detectorModelVersion,
            detectorConfidence: autoSession.lastObservation?.confidence,
            brickognizeID: brickognizeID,
            brickognizeScore: brickognizeScore,
            detectionMilliseconds: detectorDetectionMilliseconds,
            identificationMilliseconds: timings.identificationMilliseconds,
            pricingMilliseconds: timings.pricingMilliseconds,
            totalMilliseconds: Int(Date.now.timeIntervalSince(startedAt) * 1_000)
        )
        Task { try? await api.submitFeedback(feedback) }
    }

    private func logDetection(_ batch: MinifigureDetectionBatch, at now: Date) {
        performanceLogger.info(
            "model=\(batch.modelVersion, privacy: .public) inference_ms=\(batch.inferenceMilliseconds, privacy: .public) detections=\(batch.observations.count, privacy: .public)"
        )
        guard !batch.observations.isEmpty, firstDetectionAt == nil else { return }
        firstDetectionAt = now
        let elapsed = autoScanStartedAt.map { Int(now.timeIntervalSince($0) * 1_000) } ?? 0
        performanceLogger.info("first_detection_ms=\(elapsed, privacy: .public)")
    }

    private func logCaptureDuration(since startedAt: Date, automatic: Bool) {
        let elapsed = Int(Date.now.timeIntervalSince(startedAt) * 1_000)
        performanceLogger.info(
            "capture_ms=\(elapsed, privacy: .public) automatic=\(automatic, privacy: .public)"
        )
    }

    private func logResultTimings(_ timings: MinifigScanTimings, startedAt: Date) {
        let clientTotal = Int(Date.now.timeIntervalSince(startedAt) * 1_000)
        let detectedToResult = firstDetectionAt.map { Int(Date.now.timeIntervalSince($0) * 1_000) } ?? clientTotal
        performanceLogger.info(
            "identify_ms=\(timings.identificationMilliseconds ?? -1, privacy: .public) pricing_ms=\(timings.pricingMilliseconds ?? -1, privacy: .public) server_total_ms=\(timings.totalMilliseconds ?? -1, privacy: .public) client_total_ms=\(clientTotal, privacy: .public) detected_to_result_ms=\(detectedToResult, privacy: .public)"
        )
    }

    private func freshBulkRegions(for frameTimestamp: Date) -> [BulkScanRegion] {
        bulkDetectionTracker.regions(for: frameTimestamp)
    }

    private func logBulkResult(_ response: BulkMinifigScanPayload, startedAt: Date) {
        let clientTotal = Int(Date.now.timeIntervalSince(startedAt) * 1_000)
        performanceLogger.info(
            "bulk_preprocess_ms=\(response.timings.preprocessingMilliseconds ?? -1, privacy: .public) identify_ms=\(response.timings.identificationMilliseconds ?? -1, privacy: .public) pricing_ms=\(response.timings.pricingMilliseconds ?? -1, privacy: .public) server_total_ms=\(response.timings.totalMilliseconds ?? -1, privacy: .public) client_total_ms=\(clientTotal, privacy: .public) provider_requests=\(response.timings.providerRequests ?? -1, privacy: .public) results=\(response.items.count, privacy: .public) unresolved=\(response.unresolvedCount, privacy: .public) partial=\(response.partial, privacy: .public)"
        )
    }
}
