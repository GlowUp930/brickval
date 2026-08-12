import Foundation

struct LocalDetectionSchedule: Equatable, Sendable {
    private(set) var isInFlight = false
    private(set) var lastStartedAt: Date?
    private(set) var lastFrameTimestamp: Date?

    private let minimumInterval: TimeInterval
    private let maximumFrameAge = 0.35

    init(framesPerSecond: Double = 6) {
        minimumInterval = 1.0 / max(1, framesPerSecond)
    }

    func shouldProcess(frameTimestamp: Date, now: Date) -> Bool {
        guard !isInFlight,
              now.timeIntervalSince(frameTimestamp) <= maximumFrameAge,
              frameTimestamp > lastFrameTimestamp ?? .distantPast
        else { return false }
        guard let lastStartedAt else { return true }
        return now.timeIntervalSince(lastStartedAt) >= minimumInterval - 0.001
    }

    mutating func didStart(frameTimestamp: Date, now: Date) {
        isInFlight = true
        lastStartedAt = now
        lastFrameTimestamp = frameTimestamp
    }

    mutating func didFinish() {
        isInFlight = false
    }
}
