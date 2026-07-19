import Foundation

struct HostedDetectionPayload: Decodable, Sendable {
    let status: String
    let detectorModelVersion: String
    let detectMs: Int
    let observations: [DetectionObservation]
}
