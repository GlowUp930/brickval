import Testing
import CoreGraphics
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

    @Test
    func choosingWithCandidatesReservesSpaceForTheCandidateRow() {
        let candidate = BulkScanReviewCandidate(
            identifier: "sh0115",
            score: 0.82,
            result: LookupResult(
                identifier: "sh0115",
                itemType: .minifig,
                name: "Spider-Man",
                theme: "Super Heroes",
                pieces: nil,
                yearReleased: nil,
                isObsolete: nil,
                imageURL: nil,
                pricing: LookupPricing(
                    heroNewAverageUSD: nil,
                    rrpUSD: nil,
                    gainPercent: nil,
                    dataSource: nil,
                    newSoldAverageUSD: nil,
                    usedSoldAverageUSD: 5.14,
                    newStockAverageUSD: nil,
                    usedStockAverageUSD: nil,
                    brickLinkNewAverageUSD: nil,
                    brickLinkUsedAverageUSD: nil
                ),
                marketHistory: [],
                colorID: nil,
                colorName: nil
            )
        )

        let state = BulkRecoveryState.choosing(box: box, candidates: [candidate])

        #expect(state.candidateCount == 1)
        #expect(state.candidateChooserHeight >= 120)
    }

    @Test
    func tapPlannerCentersRecoveryCropOnTheUserTap() {
        let box = BulkRecoveryTapPlanner.focusBox(for: CGPoint(x: 0.35, y: 0.35))

        #expect(box.center.x == 0.35)
        #expect(box.center.y == 0.35)
        #expect(box.width == 0.26)
        #expect(box.height == 0.30)
    }

    @Test
    func choosingStateKeepsTheReviewFlowActiveUntilCandidateIsAccepted() {
        let state = BulkRecoveryState.choosing(box: box, candidates: [])

        #expect(state.isActive)
        #expect(state.selectedBox == box)
        #expect(state.candidateCount == 0)
    }
}
