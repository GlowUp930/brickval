import Testing
@testable import BrickVal

struct DetectionSamplePlannerTests {
    @Test func singleUsesCenteredSquare() {
        let plan = DetectionSamplePlanner.plan(width: 1200, height: 800, mode: .single)
        #expect(plan.crop?.origin.x == 200)
        #expect(plan.crop?.origin.y == 0)
        #expect(plan.crop?.width == 800)
        #expect(plan.outputSize.width == 416)
        #expect(plan.outputSize.height == 416)
    }

    @Test func bulkKeepsFullAspectRatio() {
        let plan = DetectionSamplePlanner.plan(width: 1200, height: 800, mode: .bulk)
        #expect(plan.crop == nil)
        #expect(plan.outputSize.width == 416)
        #expect(plan.outputSize.height > 277 && plan.outputSize.height < 278)
    }

    @Test func mapsCentreCropBoxBackToPortraitPreview() {
        let mapped = DetectionSamplePlanner.mapToSource(
            NormalizedBoundingBox(x: 0.25, y: 0.25, width: 0.5, height: 0.5),
            width: 1200,
            height: 1600,
            mode: .single
        )

        #expect(abs(mapped.x - 0.25) < 0.0001)
        #expect(abs(mapped.y - 0.3125) < 0.0001)
        #expect(abs(mapped.width - 0.5) < 0.0001)
        #expect(abs(mapped.height - 0.375) < 0.0001)
    }
}
