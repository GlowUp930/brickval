import Foundation

enum BulkRevealPhase: Equatable, Sendable {
    case preparing
    case sweeping(index: Int)
    case finalSummary
}

struct BulkRevealEntry: Identifiable, Sendable {
    let id: String
    let item: BulkScanResultItem
    let spatialNumber: Int

    var boundingBox: NormalizedBoundingBox? { item.boundingBox }
    var confidence: Double { item.confidence }
    var usedValue: Double? { item.result.pricing.preferredUsedValue }
    var newValue: Double? { item.result.pricing.preferredNewValue }

    func value(for condition: CollectionCondition) -> Double? {
        condition == .used ? usedValue : newValue
    }

    var confidenceTitle: String {
        confidence >= 0.8 ? "High confidence" : "Review match"
    }

    var priceSourceTitle: String {
        item.result.pricing.dataSource == "sold"
            ? "Sold value"
            : "Estimated market value"
    }
}

struct BulkRevealSession: Sendable {
    static let minimumDuration: TimeInterval = 3.0
    static let maximumDuration: TimeInterval = 12.0

    let entries: [BulkRevealEntry]
    private(set) var phase: BulkRevealPhase = .preparing
    private(set) var revealedCount = 0
    private(set) var condition: CollectionCondition = .used

    init(items: [BulkScanResultItem]) {
        let ordered = items.sorted { lhs, rhs in
            guard let left = lhs.boundingBox, let right = rhs.boundingBox else {
                return lhs.id < rhs.id
            }
            let rowDelta = left.y - right.y
            return abs(rowDelta) > 0.10 ? rowDelta < 0 : left.x < right.x
        }
        entries = ordered.enumerated().map { index, item in
            BulkRevealEntry(id: item.id, item: item, spatialNumber: index + 1)
        }
    }

    var isComplete: Bool {
        if case .finalSummary = phase { return true }
        return false
    }

    var currentEntry: BulkRevealEntry? {
        guard case .sweeping(let index) = phase, entries.indices.contains(index) else { return nil }
        return entries[index]
    }

    // Compatibility alias for existing callers that used the old spotlight name.
    var activeEntry: BulkRevealEntry? { currentEntry }

    var revealedEntries: ArraySlice<BulkRevealEntry> {
        entries.prefix(revealedCount)
    }

    var revealedTotal: Double {
        revealedEntries.compactMap { $0.value(for: condition) }.reduce(0, +)
    }

    /// Keeps small lots readable while making dense lots feel like one continuous sweep.
    var stepInterval: TimeInterval {
        Self.stepInterval(for: entries.count)
    }

    static func stepInterval(for itemCount: Int) -> TimeInterval {
        switch itemCount {
        case 0...5: 0.40
        case 6...20: 0.25
        default: 0.18
        }
    }

    var duration: TimeInterval {
        guard !entries.isEmpty else { return Self.minimumDuration }
        let intro = 0.42
        let outro = 0.45
        return min(
            Self.maximumDuration,
            max(Self.minimumDuration, intro + stepInterval * Double(entries.count) + outro)
        )
    }

    mutating func begin() {
        guard !entries.isEmpty else {
            phase = .finalSummary
            return
        }
        revealedCount = 0
        phase = .sweeping(index: 0)
    }

    mutating func commitSweepStep() {
        guard case .sweeping(let index) = phase, index == revealedCount else { return }
        revealedCount += 1
        if revealedCount >= entries.count {
            phase = .finalSummary
        } else {
            phase = .sweeping(index: revealedCount)
        }
    }

    // Kept as a compatibility alias for existing callers and older tests.
    mutating func commitActiveEntry() {
        commitSweepStep()
    }

    mutating func skip() {
        revealedCount = entries.count
        phase = .finalSummary
    }

    mutating func replay() {
        revealedCount = 0
        phase = .preparing
    }

    mutating func setCondition(_ condition: CollectionCondition) {
        self.condition = condition
    }
}
