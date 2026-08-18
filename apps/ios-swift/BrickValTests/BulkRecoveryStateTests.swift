import CoreGraphics
import Testing
@testable import BrickVal

struct BulkRecoveryStateTests {
    private func selection(_ index: Int, point: CGPoint? = nil) -> BulkRecoverySelection {
        let point = point ?? CGPoint(x: 0.18 + Double(index) * 0.2, y: 0.35)
        return BulkRecoverySelection(
            id: "selection-\(index)",
            order: index,
            normalizedPoint: BulkRecoveryPoint(point),
            focusBox: BulkRecoveryTapPlanner.focusBox(for: point)
        )
    }

    @Test
    func selectingSeveralFiguresPreservesTapOrder() {
        var session = BulkRecoverySession()
        let first = selection(0)
        let second = selection(1)
        let third = selection(2)

        session.toggle(first)
        session.toggle(second)
        session.toggle(third)

        #expect(session.selections.map(\.id) == ["selection-0", "selection-1", "selection-2"])
        #expect(session.selectedCount == 3)
    }

    @Test
    func tappingInsideExistingFocusBracketRemovesOnlyThatSelection() {
        var session = BulkRecoverySession()
        let first = selection(0)
        let second = selection(1)
        session.toggle(first)
        session.toggle(second)

        let didRemove = session.removeSelection(near: first.normalizedPoint)
        #expect(didRemove)
        #expect(session.selections.map(\.id) == ["selection-1"])
    }

    @Test
    func removingAndAddingASelectionKeepsTapOrderContiguous() {
        var session = BulkRecoverySession()
        session.toggle(selection(0))
        session.toggle(selection(1))
        session.toggle(selection(2))

        let didRemove = session.removeSelection(near: selection(1).normalizedPoint)
        session.toggle(selection(3))

        #expect(didRemove)
        #expect(session.selections.map(\.order) == [0, 1, 2])
        #expect(session.selections.map(\.id) == ["selection-0", "selection-2", "selection-3"])
    }

    @Test
    func selectionCountIsCappedAtTen() {
        var session = BulkRecoverySession()
        for index in 0..<12 {
            session.toggle(selection(index))
        }

        #expect(session.selectedCount == BulkRecoverySession.maximumSelections)
        #expect(!session.canAddSelection)
    }

    @Test
    func processingRetainsSelectionsAndReportsProgressResultsInOrder() {
        var session = BulkRecoverySession()
        let first = selection(0)
        let second = selection(1)
        session.toggle(first)
        session.toggle(second)
        session.beginProcessing()

        session.record([
            .skipped(selection: second, failure: .unavailable),
            .skipped(selection: first, failure: .noMatch)
        ])

        #expect(session.selections.map(\.id) == ["selection-0", "selection-1"])
        #expect(session.completedCount == 2)
        #expect(session.skippedCount == 2)
        #expect(session.reviewableOutcomes.isEmpty)
    }

    @Test
    func matchedOutcomesAreReviewedInTapOrderDespiteCompletionOrder() {
        var session = BulkRecoverySession()
        let first = selection(0)
        let second = selection(1)
        session.toggle(first)
        session.toggle(second)
        session.beginProcessing()

        session.record([
            .matched(selection: second, candidates: []),
            .matched(selection: first, candidates: [])
        ])

        #expect(session.reviewableOutcomes.map(\.selection.id) == ["selection-0", "selection-1"])
    }

    @Test
    func activeStatesExposeTheSessionAndFocusedReviewSelection() {
        let first = selection(0)
        var session = BulkRecoverySession()
        session.toggle(first)
        let state = BulkRecoveryState.reviewing(session)

        #expect(state.isActive)
        #expect(state.session?.selectedCount == 1)
        #expect(state.currentSelection == nil)
    }
}
