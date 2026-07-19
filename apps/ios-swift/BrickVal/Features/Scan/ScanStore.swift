@preconcurrency import AVFoundation
import Foundation
import Observation

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
    var presentedSheet: ScannerSheet?
    private(set) var smartScanAvailable = true
    private(set) var smartScanMessage: String?
    private(set) var detectorModelVersion: String?
    private(set) var isTorchEnabled = false

    @ObservationIgnored private let camera: CameraService
    @ObservationIgnored private let motion: MotionStabilityService
    @ObservationIgnored private let imageProcessor: ImageProcessor
    @ObservationIgnored private let api: BrickValAPIClient
    @ObservationIgnored private var autoSession = AutoScanSession()
    @ObservationIgnored private var schedule = HostedDetectionSchedule()
    @ObservationIgnored private let hostedSmartScanEnabled: Bool
    @ObservationIgnored private var feedbackConsent = false
    @ObservationIgnored private var detectorDetectionMilliseconds: Int?

    init(
        camera: CameraService = CameraService(),
        motion: MotionStabilityService = MotionStabilityService(),
        imageProcessor: ImageProcessor = ImageProcessor(),
        api: BrickValAPIClient = .live(),
        hostedSmartScanEnabled: Bool = APIConfiguration.live.hostedSmartScanEnabled
    ) {
        self.camera = camera
        self.motion = motion
        self.imageProcessor = imageProcessor
        self.api = api
        self.hostedSmartScanEnabled = hostedSmartScanEnabled
        smartScanAvailable = hostedSmartScanEnabled
        smartScanMessage = hostedSmartScanEnabled
            ? nil
            : "Automatic scanning is unavailable. Switch to Bulk to capture manually."
    }

    var captureSession: AVCaptureSession { camera.sessionBox.session }

    var canUseSmartScan: Bool {
        mode == .minifig && intent == .single && smartScanAvailable
    }

    func setFeedbackConsent(_ enabled: Bool) {
        feedbackConsent = enabled
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
            phase = .searching
            while !Task.isCancelled {
                try await Task.sleep(for: .milliseconds(100))
                guard phase != .result, phase != .review else { continue }
                if canUseSmartScan {
                    await pollSmartScan()
                    guard canUseSmartScan else { continue }
                    await advanceStability()
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
        guard intent == .bulk, phase != .capturing, phase != .identifying else { return }
        do {
            phase = .capturing
            let data = try await camera.captureFrame()
            try await identify(imageData: data)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    func identifyGalleryImage(_ data: Data) async {
        guard phase != .identifying else { return }
        do {
            try await identify(imageData: data)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    func manualLookup(identifier: String, type: ItemType, colorID: Int?) async throws {
        phase = .identifying
        let result = try await api.lookup(identifier, type, colorID)
        phase = .result
        presentedSheet = .result(result)
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
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    func reset() {
        presentedSheet = nil
        phase = .searching
        resetDetectionState()
    }

    private func pollSmartScan() async {
        guard intent == .single else { return }
        let cameraStable = await motion.isStable()
        let now = Date.now
        guard schedule.shouldSample(now: now, cameraStable: cameraStable) else { return }
        schedule.start(now: now)
        defer { schedule.complete() }

        do {
            let source = try await camera.captureFrame()
            let sample = try await imageProcessor.detectionSample(from: source, mode: .single)
            switch try await api.detectMinifigures(sample) {
            case .capReached(let modelVersion):
                detectorModelVersion = modelVersion
                disableSmartScan(message: "Automatic scanning reached its monthly limit.")
            case .available(let modelVersion, let detectionMilliseconds, let newObservations):
                detectorModelVersion = modelVersion
                detectorDetectionMilliseconds = detectionMilliseconds
                guard intent == .single else { return }
                observations = try await imageProcessor.previewObservations(
                    newObservations,
                    sourceData: source,
                    mode: .single
                )
                autoSession.observe(newObservations)
                phase = autoSession.phase == .detected ? .holding : .searching
            }
        } catch is CancellationError {
            return
        } catch CameraError.frameUnavailable {
            return
        } catch let error as APIError where [429, 503].contains(error.statusCode) {
            disableSmartScan(message: "Automatic scanning is temporarily unavailable.")
        } catch {
            disableSmartScan(message: "Automatic scanning paused because the detector could not be reached.")
        }
    }

    private func advanceStability() async {
        let stable = await motion.isStable()
        autoSession.observeStability(
            now: .now,
            deviceStable: stable,
            targetStable: autoSession.lastObservation != nil
        )
        if autoSession.phase == .holding { phase = .holding }
        guard autoSession.captureRequested else { return }
        do {
            phase = .capturing
            let data = try await camera.captureFrame()
            try await identify(imageData: data)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    private func identify(imageData: Data) async throws {
        let startedAt = Date.now
        phase = .identifying
        let image = try await imageProcessor.finalScanImage(from: imageData)
        if mode == .minifig, intent == .single {
            switch try await api.scanMinifigure(image) {
            case .matched(let identification, let lookup):
                phase = .result
                presentedSheet = .result(lookup)
                submitFeedback(
                    outcome: .matched,
                    image: image,
                    brickognizeID: identification.id,
                    brickognizeScore: identification.score,
                    startedAt: startedAt
                )
            case .review(let detections):
                phase = .review
                presentedSheet = .review(ScanReview(detections: detections))
                submitFeedback(
                    outcome: .lowConfidence,
                    image: image,
                    brickognizeID: detections.first?.id,
                    brickognizeScore: detections.first?.score,
                    startedAt: startedAt
                )
            case .notFound:
                phase = .failed("No minifigure match was found. Try a closer, brighter photo.")
                submitFeedback(
                    outcome: .brickognizeRejected,
                    image: image,
                    brickognizeID: nil,
                    brickognizeScore: nil,
                    startedAt: startedAt
                )
            }
            return
        }

        let identification = try await api.identify(image, mode, intent)
        guard !identification.detections.isEmpty || identification.setNumber != nil else {
            phase = .failed("No match was found. Try a clearer photo.")
            return
        }

        if mode == .minifig, intent == .bulk {
            let minifigures = identification.detections.filter { $0.itemType == .minifig }
            let parts = identification.detections.filter { $0.itemType == .part }
            let rows = minifigures.isEmpty
                ? []
                : try await api.bulkLookupMinifigures(minifigures.map(\.id))
            let priced = rows.compactMap(\.result)
            let missingIDs = Set(rows.filter { !$0.wasFound }.map(\.figNumber))
            let unresolved = parts + minifigures.filter { missingIDs.contains($0.id) }
            phase = .review
            presentedSheet = .bulkResults(results: priced, unresolved: unresolved)
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
    }

    private func disableSmartScan(message: String) {
        smartScanAvailable = false
        smartScanMessage = "\(message) Switch to Bulk to capture manually."
        resetDetectionState()
        phase = .searching
    }

    private func resetDetectionState() {
        observations = []
        autoSession = AutoScanSession()
        schedule = HostedDetectionSchedule()
        detectorDetectionMilliseconds = nil
    }

    private func submitFeedback(
        outcome: MinifigFeedback.Outcome,
        image: Data,
        brickognizeID: String?,
        brickognizeScore: Double?,
        startedAt: Date
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
            identificationMilliseconds: nil,
            pricingMilliseconds: nil,
            totalMilliseconds: Int(Date.now.timeIntervalSince(startedAt) * 1_000)
        )
        Task { try? await api.submitFeedback(feedback) }
    }
}
