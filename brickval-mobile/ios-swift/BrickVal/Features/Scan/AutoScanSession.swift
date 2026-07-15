import Foundation

struct AutoScanSession: Equatable, Sendable {
    var phase: AutoScanPhase = .searching
    var captureRequested = false
    var stableSince: Date?
    var consistentObservationCount = 0
    var blockReason: AutoScanBlockReason?
    var lastObservation: DetectionObservation?

    mutating func observe(_ observations: [DetectionObservation]) {
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
        guard observation.confidence >= 0.75 else {
            self = AutoScanSession()
            return
        }

        let coverage = observation.detectionFrameCoverage ?? observation.boundingBox.area
        guard (0.15 ... 0.75).contains(coverage) else {
            self = AutoScanSession()
            return
        }

        consistentObservationCount = lastObservation.map { Self.isConsistent($0, observation) } == true
            ? consistentObservationCount + 1
            : 1
        lastObservation = observation
        stableSince = nil
        captureRequested = false
        blockReason = nil
        phase = consistentObservationCount >= 2 ? .detected : .searching
    }

    mutating func observeStability(now: Date, deviceStable: Bool, targetStable: Bool) {
        guard consistentObservationCount >= 2, deviceStable, targetStable else {
            phase = lastObservation == nil ? .searching : .detected
            captureRequested = false
            stableSince = nil
            return
        }
        let start = stableSince ?? now
        stableSince = start
        if now.timeIntervalSince(start) >= 0.6 {
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
