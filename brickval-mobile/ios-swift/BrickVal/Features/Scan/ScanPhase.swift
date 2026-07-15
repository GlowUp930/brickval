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

    var statusText: String {
        switch self {
        case .idle: "Ready"
        case .preparingCamera: "Preparing camera…"
        case .searching: "Hold a minifigure inside the frame"
        case .holding: "Hold steady…"
        case .capturing: "Capturing…"
        case .identifying: "Finding the exact item…"
        case .review: "Review the detected items"
        case .result: "Match found"
        case .failed(let message): message
        }
    }
}
