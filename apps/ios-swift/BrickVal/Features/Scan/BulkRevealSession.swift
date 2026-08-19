import Foundation

enum BulkRevealPhase: Equatable, Sendable {
    case preparing
    case revealing(index: Int)
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
    static let minimumDuration: TimeInterval = 4.0
    static let maximumDuration: TimeInterval = 20.0

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

    var activeEntry: BulkRevealEntry? {
        guard case .revealing(let index) = phase, entries.indices.contains(index) else { return nil }
        return entries[index]
    }

    var revealedEntries: ArraySlice<BulkRevealEntry> {
        entries.prefix(revealedCount)
    }

    var revealedTotal: Double {
        revealedEntries.compactMap { $0.value(for: condition) }.reduce(0, +)
    }

    var duration: TimeInterval {
        guard !entries.isEmpty else { return Self.minimumDuration }
        let itemDuration = min(1.0, max(0.28, 9.0 / Double(entries.count)))
        return min(Self.maximumDuration, max(Self.minimumDuration, 0.65 + itemDuration * Double(entries.count)))
    }

    mutating func begin() {
        guard !entries.isEmpty else {
            phase = .finalSummary
            return
        }
        revealedCount = 0
        phase = .revealing(index: 0)
    }

    mutating func commitActiveEntry() {
        guard case .revealing(let index) = phase, index == revealedCount else { return }
        revealedCount += 1
        if revealedCount >= entries.count {
            phase = .finalSummary
        } else {
            phase = .revealing(index: revealedCount)
        }
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
