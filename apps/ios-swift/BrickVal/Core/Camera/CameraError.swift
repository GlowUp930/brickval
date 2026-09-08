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
        case .permissionDenied: BrickValLocalization.localized("Camera access is off. Enable it in Settings to scan.")
        case .unavailable: BrickValLocalization.localized("No camera is available on this device.")
        case .configurationFailed: BrickValLocalization.localized("The camera could not be prepared.")
        case .captureFailed: BrickValLocalization.localized("The photo could not be captured. Try again.")
        case .captureInProgress: BrickValLocalization.localized("The camera is already taking a photo.")
        case .frameUnavailable: BrickValLocalization.localized("The camera is still preparing. Try again in a moment.")
        case .invalidImage: BrickValLocalization.localized("The selected image could not be read.")
        case .sampleTooLarge: BrickValLocalization.localized("The smart-scan sample could not be made small enough.")
        }
    }
}
