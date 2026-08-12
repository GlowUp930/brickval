@preconcurrency import AVFoundation
import Foundation
import Observation
import OSLog

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
    private(set) var smartScanAvailable = true
    private(set) var smartScanMessage: String?
    private(set) var detectorModelVersion: String?
    private(set) var isTorchEnabled = false
    private(set) var frozenImageData: Data?
    private(set) var successMessage: String?
    private(set) var proLimitFeature: ProFeature?

    @ObservationIgnored private let camera: CameraService
    @ObservationIgnored private let motion: MotionStabilityService
    @ObservationIgnored private let imageProcessor: ImageProcessor
    @ObservationIgnored private let api: BrickValAPIClient
    @ObservationIgnored private let detector: any MinifigureDetecting
    @ObservationIgnored private let soundEffects: SoundEffectPlayer
    @ObservationIgnored private var monetization: MonetizationStore?
    @ObservationIgnored private var isProSubscriber = false
    @ObservationIgnored private var autoSession = AutoScanSession()
    @ObservationIgnored private var schedule = LocalDetectionSchedule()
    @ObservationIgnored private var feedbackConsent = false
    @ObservationIgnored private var detectorDetectionMilliseconds: Int?
    @ObservationIgnored private var autoScanStartedAt: Date?
    @ObservationIgnored private var firstDetectionAt: Date?
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
        onDeviceSmartScanEnabled: Bool = true
    ) {
        self.camera = camera
        self.motion = motion
        self.imageProcessor = imageProcessor
        self.api = api
        self.detector = detector
        self.soundEffects = SoundEffectPlayer()
        smartScanAvailable = onDeviceSmartScanEnabled
        smartScanMessage = onDeviceSmartScanEnabled
            ? nil
            : "Automatic scan paused. Tap the shutter to scan manually."
    }

    var captureSession: AVCaptureSession { camera.sessionBox.session }

    var canUseSmartScan: Bool {
        mode == .minifig &&
            intent == .single &&
            smartScanAvailable &&
            canBeginSingleScan
    }

#if DEBUG
    func configureProcessingLayoutDemo(imageData: Data) {
        authorizationStatus = .authorized
        frozenImageData = imageData
        phase = .identifying
    }
#endif

    func setFeedbackConsent(_ enabled: Bool) {
        feedbackConsent = enabled
    }

    func configureMonetization(_ monetization: MonetizationStore, isPro: Bool) {
        self.monetization = monetization
        isProSubscriber = isPro
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
                guard phase != .result,
                      phase != .review,
                      phase != .capturing,
                      phase != .identifying
                else { continue }
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

    func toggleTorch() async {
        do {
            try await camera.setTorch(enabled: !isTorchEnabled)
            isTorchEnabled.toggle()
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    func captureManually() async {
        guard phase != .capturing, phase != .identifying else { return }
        guard canBeginSingleScan else {
            proLimitFeature = .singleScan
            return
        }
        do {
            phase = .capturing
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
            frozenImageData = data
            logCaptureDuration(since: captureStartedAt, automatic: false)
            try await identify(imageData: data, bulkRegions: capture.regions)
        } catch {
            handleIdentificationError(error)
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
            handleIdentificationError(error)
        }
    }

    func manualLookup(identifier: String, type: ItemType, colorID: Int?) async throws {
        phase = .identifying
        let result = try await api.lookup(identifier, type, colorID)
        phase = .result
        presentedSheet = .result(result)
        soundEffects.play(.cashRegister)
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
        } catch {
            phase = .failed(error.localizedDescription)
        }
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
        guard presentedSheet == nil else {
            presentedSheet = nil
            return
        }
        returnToLiveScanner()
    }

    private func returnToLiveScanner() {
        frozenImageData = nil
        phase = .searching
        resetDetectionState()
    }

    func completeBulkSave(count: Int) {
        reset()
        let message = "Added \(count) \(count == 1 ? "item" : "items") to your collection"
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
            let batch = try await detector.detect(in: frame)
            detectorModelVersion = batch.modelVersion
            detectorDetectionMilliseconds = batch.inferenceMilliseconds
            if intent == .bulk {
                observations = Array(
                    batch.observations
                        .filter { $0.fullyVisible && $0.boundingBox.area >= 0.005 }
                        .prefix(10)
                )
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
            disableSmartScan(message: "Automatic scanning paused because the on-device detector could not start.")
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
        do {
            let captureStartedAt = Date.now
            let data = try await camera.jpegData(for: frame)
            frozenImageData = data
            logCaptureDuration(since: captureStartedAt, automatic: true)
            try await identify(imageData: data, focusBox: focusBox)
        } catch is CancellationError {
            return
        } catch {
            handleIdentificationError(error)
        }
    }

    private func identify(
        imageData: Data,
        focusBox: NormalizedBoundingBox? = nil,
        bulkRegions: [BulkScanRegion] = []
    ) async throws {
        let startedAt = Date.now
        phase = .identifying
        frozenImageData = imageData
        if mode == .minifig, intent == .bulk {
            let image = try await imageProcessor.bulkScanImage(from: imageData)
            let response = try await api.scanBulkMinifigures(image, bulkRegions)
            let items = response.items.map(\.normalized)
            guard let frozenImageData, !items.isEmpty else {
                self.frozenImageData = nil
                phase = .failed("No priced minifigures were found. Try a brighter photo with up to 10 figures separated and facing forward.")
                return
            }
            monetization?.recordSuccessfulBulk(serverUsage: response.usage)
            phase = .review
            presentedSheet = .bulkResults(imageData: frozenImageData, items: items)
            soundEffects.play(.cashRegister)
            logBulkResult(response, startedAt: startedAt)
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
            case .review(let detections, let timings, let usage):
                let candidates = ScanReviewCandidate.make(from: detections)
                guard !candidates.isEmpty else {
                    phase = .failed("No minifigure match was found. Try a closer, brighter photo.")
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
            case .notFound(let timings):
                phase = .failed("No minifigure match was found. Try a closer, brighter photo.")
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
            phase = .failed("No match was found. Try a clearer photo.")
            return
        }

        let identifier = identification.setNumber ?? identification.detections.first?.id
        guard let identifier else {
            phase = .failed("The item could not be identified.")
            return
        }
        let result = try await api.lookup(identifier, mode == .set ? .set : .minifig, nil)
        phase = .result
        presentedSheet = .result(result)
        soundEffects.play(.cashRegister)
    }

    private func disableSmartScan(message: String) {
        smartScanAvailable = false
        smartScanMessage = "\(message) Tap the shutter to scan manually."
        resetDetectionState()
        phase = .searching
    }

    private func handleIdentificationError(_ error: Error) {
        frozenImageData = nil
        if let apiError = error as? APIError, apiError.isProLimit {
            monetization?.applyServerUsage(apiError.usage)
            proLimitFeature = apiError.feature
            returnToLiveScanner()
            return
        }
        phase = .failed(error.localizedDescription)
    }

    private var canBeginSingleScan: Bool {
        intent != .single || monetization?.canUseSingle(isPro: isProSubscriber) != false
    }

    private func resetDetectionState() {
        observations = []
        autoSession = AutoScanSession()
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
        observations
            .filter { abs(frameTimestamp.timeIntervalSince($0.timestamp)) <= 0.45 }
            .prefix(10)
            .map { BulkScanRegion(regionId: $0.regionID, boundingBox: $0.boundingBox.clamped) }
    }

    private func logBulkResult(_ response: BulkMinifigScanPayload, startedAt: Date) {
        let clientTotal = Int(Date.now.timeIntervalSince(startedAt) * 1_000)
        performanceLogger.info(
            "bulk_preprocess_ms=\(response.timings.preprocessingMilliseconds ?? -1, privacy: .public) identify_ms=\(response.timings.identificationMilliseconds ?? -1, privacy: .public) pricing_ms=\(response.timings.pricingMilliseconds ?? -1, privacy: .public) server_total_ms=\(response.timings.totalMilliseconds ?? -1, privacy: .public) client_total_ms=\(clientTotal, privacy: .public) provider_requests=\(response.timings.providerRequests ?? -1, privacy: .public) results=\(response.items.count, privacy: .public) unresolved=\(response.unresolvedCount, privacy: .public) partial=\(response.partial, privacy: .public)"
        )
    }
}
