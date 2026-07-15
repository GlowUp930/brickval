@preconcurrency import AVFoundation
import Foundation

final class PhotoCaptureDelegate: NSObject, AVCapturePhotoCaptureDelegate, @unchecked Sendable {
    private let continuation: CheckedContinuation<Data, Error>

    init(continuation: CheckedContinuation<Data, Error>) {
        self.continuation = continuation
    }

    func photoOutput(
        _ output: AVCapturePhotoOutput,
        didFinishProcessingPhoto photo: AVCapturePhoto,
        error: Error?
    ) {
        if let error {
            continuation.resume(throwing: error)
        } else if let data = photo.fileDataRepresentation() {
            continuation.resume(returning: data)
        } else {
            continuation.resume(throwing: CameraError.captureFailed)
        }
    }
}
