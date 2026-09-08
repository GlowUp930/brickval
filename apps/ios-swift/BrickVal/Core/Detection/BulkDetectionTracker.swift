import CoreGraphics
import Foundation

struct BulkDetectionTracker: Sendable {
    private struct Track: Sendable {
        var observation: DetectionObservation
        var lastSeenAt: Date
    }

    private let retention: TimeInterval = 1.25
    private var tracks: [Track] = []
    private var nextGeneratedID = 1

    mutating func ingest(_ observations: [DetectionObservation], at timestamp: Date) {
        prune(at: timestamp)

        for observation in observations
            .filter({ $0.fullyVisible && $0.boundingBox.area >= 0.005 })
            .sorted(by: { $0.confidence > $1.confidence }) {
            if let index = matchingTrack(for: observation) {
                let regionID = tracks[index].observation.regionID
                tracks[index] = Track(
                    observation: DetectionObservation(
                        confidence: observation.confidence,
                        boundingBox: observation.boundingBox.clamped,
                        detectionFrameCoverage: observation.detectionFrameCoverage,
                        fullyVisible: observation.fullyVisible,
                        regionID: regionID,
                        timestamp: timestamp
                    ),
                    lastSeenAt: timestamp
                )
            } else {
                let regionID = uniqueRegionID(preferred: observation.regionID)
                tracks.append(Track(
                    observation: DetectionObservation(
                        confidence: observation.confidence,
                        boundingBox: observation.boundingBox.clamped,
                        detectionFrameCoverage: observation.detectionFrameCoverage,
                        fullyVisible: observation.fullyVisible,
                        regionID: regionID,
                        timestamp: timestamp
                    ),
                    lastSeenAt: timestamp
                ))
            }
        }

        tracks.sort { lhs, rhs in
            if abs(lhs.observation.boundingBox.y - rhs.observation.boundingBox.y) > 0.12 {
                return lhs.observation.boundingBox.y < rhs.observation.boundingBox.y
            }
            return lhs.observation.boundingBox.x < rhs.observation.boundingBox.x
        }
    }

    func observations(for timestamp: Date) -> [DetectionObservation] {
        tracks
            .filter { timestamp.timeIntervalSince($0.lastSeenAt) <= retention }
            .map(\.observation)
    }

    func regions(for timestamp: Date) -> [BulkScanRegion] {
        observations(for: timestamp)
            .prefix(BulkScanSource.maximumRegionCount)
            .map { BulkScanRegion(regionId: $0.regionID, boundingBox: $0.boundingBox.clamped) }
    }

    mutating func reset() {
        tracks.removeAll(keepingCapacity: true)
        nextGeneratedID = 1
    }

    private mutating func prune(at timestamp: Date) {
        tracks.removeAll { timestamp.timeIntervalSince($0.lastSeenAt) > retention }
    }

    private func matchingTrack(for observation: DetectionObservation) -> Int? {
        let candidates = tracks.enumerated().compactMap { index, track -> (Int, Double)? in
            let overlap = overlapOfSmaller(track.observation.boundingBox, observation.boundingBox)
            let distance = hypot(
                track.observation.boundingBox.center.x - observation.boundingBox.center.x,
                track.observation.boundingBox.center.y - observation.boundingBox.center.y
            )
            guard overlap >= 0.18 || distance <= 0.12 else { return nil }
            return (index, overlap * 2 - distance)
        }
        return candidates.max(by: { $0.1 < $1.1 })?.0
    }

    private mutating func uniqueRegionID(preferred: String) -> String {
        let used = Set(tracks.map { $0.observation.regionID })
        if !used.contains(preferred) { return preferred }

        while used.contains("bulk-\(nextGeneratedID)") {
            nextGeneratedID += 1
        }
        defer { nextGeneratedID += 1 }
        return "bulk-\(nextGeneratedID)"
    }

    private func overlapOfSmaller(_ lhs: NormalizedBoundingBox, _ rhs: NormalizedBoundingBox) -> Double {
        let right = min(lhs.x + lhs.width, rhs.x + rhs.width)
        let bottom = min(lhs.y + lhs.height, rhs.y + rhs.height)
        let intersection = max(0, right - max(lhs.x, rhs.x)) * max(0, bottom - max(lhs.y, rhs.y))
        return min(lhs.area, rhs.area) > 0 ? intersection / min(lhs.area, rhs.area) : 0
    }
}
