@preconcurrency import AVFoundation
import Foundation

actor CameraService {
    nonisolated let sessionBox = CameraSessionBox()

    private let photoOutput = AVCapturePhotoOutput()
    private var activeDelegate: PhotoCaptureDelegate?
    private var isConfigured = false

    var session: AVCaptureSession { sessionBox.session }

    func authorizationStatus() -> CameraAuthorizationStatus {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: .authorized
        case .notDetermined: .notDetermined
        default: .denied
        }
    }

    func requestAuthorization() async -> Bool {
        await AVCaptureDevice.requestAccess(for: .video)
    }

    func configure() throws {
        guard !isConfigured else { return }
        guard AVCaptureDevice.authorizationStatus(for: .video) == .authorized else {
            throw CameraError.permissionDenied
        }
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            throw CameraError.unavailable
        }

        try device.lockForConfiguration()
        if device.isFocusModeSupported(.continuousAutoFocus) {
            device.focusMode = .continuousAutoFocus
        }
        if device.isExposureModeSupported(.continuousAutoExposure) {
            device.exposureMode = .continuousAutoExposure
        }
        device.isSubjectAreaChangeMonitoringEnabled = true
        device.unlockForConfiguration()

        let input = try AVCaptureDeviceInput(device: device)
        let session = sessionBox.session
        session.beginConfiguration()
        defer { session.commitConfiguration() }
        session.sessionPreset = .photo
        guard session.canAddInput(input), session.canAddOutput(photoOutput) else {
            throw CameraError.configurationFailed
        }
        session.addInput(input)
        session.addOutput(photoOutput)
        photoOutput.maxPhotoQualityPrioritization = .balanced
        isConfigured = true
    }

    func start() throws {
        try configure()
        guard !sessionBox.session.isRunning else { return }
        sessionBox.session.startRunning()
    }

    func stop() {
        guard sessionBox.session.isRunning else { return }
        sessionBox.session.stopRunning()
    }

    func setTorch(enabled: Bool) throws {
        guard let device = (sessionBox.session.inputs.first as? AVCaptureDeviceInput)?.device,
              device.hasTorch
        else { return }
        try device.lockForConfiguration()
        defer { device.unlockForConfiguration() }
        device.torchMode = enabled ? .on : .off
    }

    func capturePhoto(prioritization: AVCapturePhotoOutput.QualityPrioritization = .quality) async throws -> Data {
        guard isConfigured else { throw CameraError.configurationFailed }
        guard activeDelegate == nil else { throw CameraError.captureInProgress }
        let settings = AVCapturePhotoSettings()
        settings.photoQualityPrioritization = prioritization
        defer { activeDelegate = nil }
        return try await withCheckedThrowingContinuation { continuation in
            let delegate = PhotoCaptureDelegate(continuation: continuation)
            activeDelegate = delegate
            photoOutput.capturePhoto(with: settings, delegate: delegate)
        }
    }
}
