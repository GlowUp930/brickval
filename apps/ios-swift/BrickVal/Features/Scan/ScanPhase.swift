import Foundation

enum ScanPhase: Equatable {
    case idle
    case preparingCamera
    case searching
    case holding
    case capturing
    case identifying
    case review
    case result
    case failed(String)

    var allowsLiveDetection: Bool {
        switch self {
        case .searching, .holding:
            true
        default:
            false
        }
    }

    var statusText: String {
        switch self {
        case .idle: BrickValLocalization.localized("Ready")
        case .preparingCamera: BrickValLocalization.localized("Preparing camera…")
        case .searching: BrickValLocalization.localized("Hold a minifigure inside the frame")
        case .holding: BrickValLocalization.localized("Hold steady…")
        case .capturing: BrickValLocalization.localized("Capturing…")
        case .identifying: BrickValLocalization.localized("Analyzing minifigures…")
        case .review: BrickValLocalization.localized("Review the detected items")
        case .result: BrickValLocalization.localized("Match found")
        case .failed(let message): message
        }
    }
}
