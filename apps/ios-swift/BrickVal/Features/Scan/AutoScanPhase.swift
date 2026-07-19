import Foundation

enum AutoScanPhase: Equatable, Sendable {
    case searching
    case detected
    case holding
    case capturing
}
