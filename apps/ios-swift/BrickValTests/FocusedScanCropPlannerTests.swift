import CoreGraphics
import Testing
@testable import BrickVal

struct FocusedScanCropPlannerTests {
    @Test func addsThirtyPercentContextAroundDetection() throws {
        let rect = try #require(FocusedScanCropPlanner.cropRect(
            for: NormalizedBoundingBox(x: 0.4, y: 0.3, width: 0.2, height: 0.4),
            imageSize: CGSize(width: 1000, height: 2000)
        ))

        #expect(abs(rect.minX - 340) <= 1)
        #expect(abs(rect.minY - 360) <= 1)
        #expect(abs(rect.width - 320) <= 2)
        #expect(abs(rect.height - 1280) <= 2)
    }

    @Test func clampsContextToImageBounds() throws {
        let rect = try #require(FocusedScanCropPlanner.cropRect(
            for: NormalizedBoundingBox(x: 0.01, y: 0.02, width: 0.2, height: 0.3),
            imageSize: CGSize(width: 1000, height: 1000)
        ))

        #expect(rect.minX == 0)
        #expect(rect.minY == 0)
        #expect(rect.maxX <= 1000)
        #expect(rect.maxY <= 1000)
    }
}
