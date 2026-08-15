import CoreGraphics
import Foundation

struct BulkRecoveryPoint: Hashable, Sendable {
    let x: Double
    let y: Double

    init(x: Double, y: Double) {
        self.x = min(max(x, 0), 1)
        self.y = min(max(y, 0), 1)
    }

    init(_ point: CGPoint) {
        self.init(x: point.x, y: point.y)
    }

    var cgPoint: CGPoint { CGPoint(x: x, y: y) }
}

struct BulkRecoverySelection: Identifiable, Hashable, Sendable {
    let id: String
    let order: Int
    let normalizedPoint: BulkRecoveryPoint
    let focusBox: NormalizedBoundingBox
    let unresolvedRegionIndex: Int?

    init(
        id: String,
        order: Int = 0,
        normalizedPoint: BulkRecoveryPoint,
        focusBox: NormalizedBoundingBox,
        unresolvedRegionIndex: Int? = nil
    ) {
        self.id = id
        self.order = order
        self.normalizedPoint = normalizedPoint
        self.focusBox = focusBox
        self.unresolvedRegionIndex = unresolvedRegionIndex
    }
}

enum BulkRecoveryFailure: Sendable {
    case noMatch
    case unavailable
    case expired
}

enum BulkRecoveryOutcome: Identifiable, Sendable {
    case matched(selection: BulkRecoverySelection, candidates: [BulkScanReviewCandidate])
    case skipped(selection: BulkRecoverySelection, failure: BulkRecoveryFailure)

    var id: String {
        switch self {
        case .matched(let selection, _), .skipped(let selection, _): selection.id
        }
    }

    var selection: BulkRecoverySelection {
        switch self {
        case .matched(let selection, _), .skipped(let selection, _): selection
        }
    }

    var candidates: [BulkScanReviewCandidate] {
        guard case .matched(_, let candidates) = self else { return [] }
        return candidates
    }

    var isMatched: Bool {
        if case .matched = self { return true }
        return false
    }
}

struct BulkRecoverySession: Sendable {
    static let maximumSelections = 10

    private(set) var selections: [BulkRecoverySelection] = []
    private(set) var outcomes: [BulkRecoveryOutcome] = []
    private(set) var completedCount = 0
    private(set) var reviewIndex = 0
    private(set) var acceptedCount = 0
    private(set) var skippedCount = 0

    var selectedCount: Int { selections.count }
    var totalCount: Int { selections.count }
    var canAddSelection: Bool { selections.count < Self.maximumSelections }
    var reviewableOutcomes: [BulkRecoveryOutcome] { outcomes.filter(\.isMatched) }
    var currentReviewOutcome: BulkRecoveryOutcome? {
        guard reviewIndex < reviewableOutcomes.count else { return nil }
        return reviewableOutcomes[reviewIndex]
    }

    mutating func toggle(_ selection: BulkRecoverySelection) {
        if let index = selections.firstIndex(where: { $0.id == selection.id }) {
            selections.remove(at: index)
            renumberSelections()
            return
        }
        guard canAddSelection else { return }
        selections.append(
            BulkRecoverySelection(
                id: selection.id,
                order: selections.count,
                normalizedPoint: selection.normalizedPoint,
                focusBox: selection.focusBox,
                unresolvedRegionIndex: selection.unresolvedRegionIndex
            )
        )
    }

    mutating func removeSelection(containing point: BulkRecoveryPoint) -> Bool {
        guard let index = selections.firstIndex(where: { $0.focusBox.contains(point) }) else { return false }
        selections.remove(at: index)
        renumberSelections()
        return true
    }

    func containsSelection(at point: BulkRecoveryPoint) -> Bool {
        selections.contains { $0.focusBox.contains(point) }
    }

    mutating func beginProcessing() {
        outcomes = []
        completedCount = 0
        reviewIndex = 0
        acceptedCount = 0
        skippedCount = 0
    }

    mutating func updateProgress(_ count: Int) {
        completedCount = min(max(count, 0), selections.count)
    }

    mutating func record(_ outcomes: [BulkRecoveryOutcome]) {
        self.outcomes = outcomes.sorted { $0.selection.order < $1.selection.order }
        completedCount = self.outcomes.count
        skippedCount = self.outcomes.filter { !$0.isMatched }.count
    }

    mutating func advanceAfterCandidateSelection() {
        acceptedCount += 1
        reviewIndex += 1
    }

    mutating func skipCurrentCandidate() {
        skippedCount += 1
        reviewIndex += 1
    }

    private mutating func renumberSelections() {
        selections = selections.enumerated().map { index, selection in
            BulkRecoverySelection(
                id: selection.id,
                order: index,
                normalizedPoint: selection.normalizedPoint,
                focusBox: selection.focusBox,
                unresolvedRegionIndex: selection.unresolvedRegionIndex
            )
        }
    }
}

extension NormalizedBoundingBox {
    func contains(_ point: BulkRecoveryPoint) -> Bool {
        point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height
    }
}

enum BulkRecoveryState: Sendable {
    case idle
    case selecting(BulkRecoverySession)
    case processing(BulkRecoverySession)
    case reviewing(BulkRecoverySession)
    case failed(BulkRecoverySession, message: String)
    case completed(addedCount: Int, skippedCount: Int)

    var isActive: Bool {
        switch self {
        case .idle, .completed: false
        case .selecting, .processing, .reviewing, .failed: true
        }
    }

    var session: BulkRecoverySession? {
        switch self {
        case .selecting(let session), .processing(let session), .reviewing(let session), .failed(let session, _): session
        case .idle, .completed: nil
        }
    }

    var currentSelection: BulkRecoverySelection? {
        switch self {
        case .reviewing(let session): session.currentReviewOutcome?.selection
        case .selecting, .processing, .failed, .idle, .completed: nil
        }
    }

    var candidateCount: Int {
        guard case .reviewing(let session) = self else { return 0 }
        return session.currentReviewOutcome?.candidates.count ?? 0
    }

    var candidateChooserHeight: Double {
        candidateCount > 0 ? BulkRecoveryLayout.candidateRowHeight : 0
    }
}
