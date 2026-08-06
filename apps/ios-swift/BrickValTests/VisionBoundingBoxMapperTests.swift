import CoreGraphics
import Testing
@testable import BrickVal

struct VisionBoundingBoxMapperTests {
    @Test func convertsVisionBottomLeftCoordinatesToPreviewTopLeftCoordinates() {
        let mapped = VisionBoundingBoxMapper.topLeftNormalized(
            CGRect(x: 0.2, y: 0.1, width: 0.4, height: 0.3)
        )

        #expect(abs(mapped.x - 0.2) < 0.0001)
        #expect(abs(mapped.y - 0.6) < 0.0001)
        #expect(abs(mapped.width - 0.4) < 0.0001)
        #expect(abs(mapped.height - 0.3) < 0.0001)
    }

    @Test func rejectsBoxesWithinThreePercentOfAnEdge() {
        let centered = NormalizedBoundingBox(x: 0.2, y: 0.2, width: 0.4, height: 0.5)
        let clipped = NormalizedBoundingBox(x: 0.02, y: 0.2, width: 0.4, height: 0.5)

        #expect(VisionBoundingBoxMapper.isFullyVisible(centered, edgeMargin: 0.03))
        #expect(!VisionBoundingBoxMapper.isFullyVisible(clipped, edgeMargin: 0.03))
    }
}
