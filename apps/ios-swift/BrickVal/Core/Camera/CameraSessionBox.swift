@preconcurrency import AVFoundation
import Foundation

final class CameraSessionBox: @unchecked Sendable {
    let session = AVCaptureSession()
}
