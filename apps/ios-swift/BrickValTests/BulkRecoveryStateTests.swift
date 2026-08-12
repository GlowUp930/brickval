import Testing
@testable import BrickVal

struct BulkRecoveryStateTests {
    private let box = NormalizedBoundingBox(x: 0.2, y: 0.3, width: 0.25, height: 0.4)

    @Test
    func idleAndSelectingStatesHaveNoFocusedBox() {
        #expect(!BulkRecoveryState.idle.isActive)
        #expect(BulkRecoveryState.idle.selectedBox == nil)
        #expect(BulkRecoveryState.selecting.isActive)
        #expect(BulkRecoveryState.selecting.selectedBox == nil)
    }

    @Test
    func activeStatesExposeTheFocusedBox() {
        #expect(BulkRecoveryState.identifying(box: box).selectedBox == box)
        #expect(BulkRecoveryState.choosing(box: box, candidates: []).selectedBox == box)
        #expect(BulkRecoveryState.failed(box: box, message: "Try again").selectedBox == box)
    }
}
