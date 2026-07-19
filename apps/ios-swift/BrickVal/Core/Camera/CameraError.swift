import Foundation

enum CameraError: LocalizedError {
    case permissionDenied
    case unavailable
    case configurationFailed
    case captureFailed
    case captureInProgress
    case frameUnavailable
    case invalidImage
    case sampleTooLarge

    var errorDescription: String? {
        switch self {
        case .permissionDenied: "Camera access is off. Enable it in Settings to scan."
        case .unavailable: "No camera is available on this device."
        case .configurationFailed: "The camera could not be prepared."
        case .captureFailed: "The photo could not be captured. Try again."
        case .captureInProgress: "The camera is already taking a photo."
        case .frameUnavailable: "The camera is still preparing. Try again in a moment."
        case .invalidImage: "The selected image could not be read."
        case .sampleTooLarge: "The smart-scan sample could not be made small enough."
        }
    }
}
