import Foundation

struct AutoScanSession: Equatable, Sendable {
    var phase: AutoScanPhase = .searching
    var captureRequested = false
    var consistentObservationCount = 0
    var blockReason: AutoScanBlockReason?
    var lastObservation: DetectionObservation?

    mutating func observe(_ observations: [DetectionObservation], deviceStable: Bool = true) {
        guard observations.count <= 1 else {
            self = AutoScanSession(blockReason: .multiple)
            return
        }
        guard let observation = observations.first else {
            self = AutoScanSession()
            return
        }
        guard observation.fullyVisible else {
            self = AutoScanSession(blockReason: .partial)
            return
        }
        guard observation.confidence >= 0.30 else {
            self = AutoScanSession()
            return
        }

        let coverage = observation.detectionFrameCoverage ?? observation.boundingBox.area
        guard (0.10 ... 0.75).contains(coverage) else {
            self = AutoScanSession()
            return
        }

        let remainsOnTarget = lastObservation.map { Self.isConsistent($0, observation) } == true
        consistentObservationCount = remainsOnTarget && deviceStable
            ? consistentObservationCount + 1
            : 1
        lastObservation = observation
        blockReason = nil
        if consistentObservationCount >= 3, deviceStable {
            phase = .capturing
            captureRequested = true
        } else {
            phase = .holding
            captureRequested = false
        }
    }

    private static func isConsistent(_ previous: DetectionObservation, _ current: DetectionObservation) -> Bool {
        let movement = hypot(
            current.boundingBox.center.x - previous.boundingBox.center.x,
            current.boundingBox.center.y - previous.boundingBox.center.y
        )
        let previousArea = previous.boundingBox.area
        let ratio = previousArea > 0 ? current.boundingBox.area / previousArea : 0
        return movement <= 0.04 && (0.75 ... 1.33).contains(ratio)
    }

    private init(blockReason: AutoScanBlockReason) {
        self.blockReason = blockReason
    }

    init() {}
}
