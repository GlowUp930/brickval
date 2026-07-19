import Foundation

struct HostedDetectionSchedule: Equatable, Sendable {
    var isInFlight = false
    var attempts = 0
    var lastRequestedAt: Date?

    func shouldSample(now: Date, cameraStable: Bool) -> Bool {
        guard cameraStable, !isInFlight else { return false }
        guard let lastRequestedAt else { return true }
        let interval = attempts >= 8 ? 2.0 : 0.8
        // Date arithmetic can land a fraction of a millisecond below the intended cadence.
        return now.timeIntervalSince(lastRequestedAt) >= interval - 0.001
    }

    mutating func start(now: Date) {
        isInFlight = true
        attempts += 1
        lastRequestedAt = now
    }

    mutating func complete() {
        isInFlight = false
    }
}
