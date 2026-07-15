import Foundation

enum HostedDetectionResult: Sendable {
    case available(modelVersion: String, detectionMilliseconds: Int, observations: [DetectionObservation])
    case capReached(modelVersion: String)
}
