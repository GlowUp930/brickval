@preconcurrency import AVFoundation
import CoreImage
import Foundation
import UIKit

actor CameraService {
    nonisolated let sessionBox = CameraSessionBox()

    private let videoOutput = AVCaptureVideoDataOutput()
    private let frameSampler = CameraFrameSampler()
    private let videoQueue = DispatchQueue(label: "com.brickval.camera.frames", qos: .userInitiated)
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
        session.sessionPreset = .high
        guard session.canAddInput(input), session.canAddOutput(videoOutput) else {
            throw CameraError.configurationFailed
        }
        session.addInput(input)
        videoOutput.alwaysDiscardsLateVideoFrames = true
        videoOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        videoOutput.setSampleBufferDelegate(frameSampler, queue: videoQueue)
        session.addOutput(videoOutput)
        if let connection = videoOutput.connection(with: .video),
           connection.isVideoRotationAngleSupported(90) {
            connection.videoRotationAngle = 90
        }
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

    func isRunning() -> Bool {
        sessionBox.session.isRunning
    }

    func setTorch(enabled: Bool) throws {
        guard let device = (sessionBox.session.inputs.first as? AVCaptureDeviceInput)?.device,
              device.hasTorch
        else { return }
        try device.lockForConfiguration()
        defer { device.unlockForConfiguration() }
        device.torchMode = enabled ? .on : .off
    }

    func captureFrame() async throws -> Data {
        guard isConfigured else { throw CameraError.configurationFailed }

        for _ in 0 ..< 5 {
            if let data = frameSampler.jpegData() { return data }
            try await Task.sleep(for: .milliseconds(80))
        }
        throw CameraError.frameUnavailable
    }

    func latestFrame() throws -> CameraFrame {
        guard isConfigured else { throw CameraError.configurationFailed }
        guard let frame = frameSampler.latestFrame() else { throw CameraError.frameUnavailable }
        return frame
    }

    func jpegData(for frame: CameraFrame) throws -> Data {
        guard let data = frameSampler.jpegData(for: frame) else { throw CameraError.invalidImage }
        return data
    }
}

private final class CameraFrameSampler: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate, @unchecked Sendable {
    private let lock = NSLock()
    private let context = CIContext(options: [.cacheIntermediates: false])
    private var frame: CameraFrame?

    func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let frame = CameraFrame(pixelBuffer: pixelBuffer, timestamp: .now)
        lock.withLock { self.frame = frame }
    }

    func latestFrame() -> CameraFrame? {
        lock.withLock { frame }
    }

    func jpegData() -> Data? {
        guard let frame = latestFrame() else { return nil }
        return jpegData(for: frame)
    }

    func jpegData(for frame: CameraFrame) -> Data? {
        var image = CIImage(cvPixelBuffer: frame.pixelBuffer)
        if image.extent.width > image.extent.height {
            image = image.oriented(.right)
        }
        guard let cgImage = context.createCGImage(image, from: image.extent) else { return nil }
        return UIImage(cgImage: cgImage).jpegData(compressionQuality: 0.86)
    }
}
