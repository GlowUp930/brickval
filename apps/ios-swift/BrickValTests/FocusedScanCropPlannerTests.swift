import CoreGraphics
import Testing
@testable import BrickVal

struct FocusedScanCropPlannerTests {
    @Test func bulkRecoveryTapCropExcludesNearbyFigure() throws {
        let imageSize = CGSize(width: 1000, height: 2165)
        let tappedFigure = CGPoint(x: 0.35, y: 0.35)
        let nearbyFigure = CGPoint(x: 0.36, y: 0.61)

        let rect = try #require(BulkRecoveryCropPlanner.cropRect(
            around: tappedFigure,
            imageSize: imageSize
        ))

        #expect(rect.contains(CGPoint(
            x: tappedFigure.x * imageSize.width,
            y: tappedFigure.y * imageSize.height
        )))
        #expect(!rect.contains(CGPoint(
            x: nearbyFigure.x * imageSize.width,
            y: nearbyFigure.y * imageSize.height
        )))
    }

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
