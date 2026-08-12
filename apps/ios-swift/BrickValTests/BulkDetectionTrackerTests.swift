import Foundation
import Testing
@testable import BrickVal

struct BulkDetectionTrackerTests {
    @Test
    func retainsARecentBoxWhenTheLatestFrameFlickers() {
        var tracker = BulkDetectionTracker()
        let first = Date(timeIntervalSince1970: 100)
        tracker.ingest([observation(x: 0.2, regionID: "local-1", timestamp: first)], at: first)

        let second = first.addingTimeInterval(0.35)
        tracker.ingest([], at: second)

        let regions = tracker.regions(for: second)

        #expect(regions.count == 1)
        #expect(regions[0].regionId == "local-1")
        #expect(regions[0].boundingBox.x == 0.2)
    }

    @Test
    func keepsTwoSpatiallySeparateFiguresAsSeparateRegions() {
        var tracker = BulkDetectionTracker()
        let timestamp = Date(timeIntervalSince1970: 100)
        tracker.ingest([
            observation(x: 0.05, regionID: "local-1", timestamp: timestamp),
            observation(x: 0.65, regionID: "local-2", timestamp: timestamp)
        ], at: timestamp)

        #expect(tracker.regions(for: timestamp).count == 2)
    }

    @Test
    func expiresOldBoxesInsteadOfUploadingStaleRegions() {
        var tracker = BulkDetectionTracker()
        let first = Date(timeIntervalSince1970: 100)
        tracker.ingest([observation(x: 0.2, regionID: "local-1", timestamp: first)], at: first)

        #expect(tracker.regions(for: first.addingTimeInterval(1.31)).isEmpty)
    }

    private func observation(
        x: Double,
        regionID: String,
        timestamp: Date
    ) -> DetectionObservation {
        DetectionObservation(
            confidence: 0.7,
            boundingBox: NormalizedBoundingBox(x: x, y: 0.2, width: 0.2, height: 0.55),
            fullyVisible: true,
            regionID: regionID,
            timestamp: timestamp
        )
    }
}
