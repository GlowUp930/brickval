import Foundation

enum BulkRevealPhase: Equatable, Sendable {
    case preparing
    case sweeping(index: Int)
    case finalSummary
}

struct BulkRevealEntry: Identifiable, Sendable {
    let id: String
    let boundingBox: NormalizedBoundingBox?
    let spatialNumber: Int
    private(set) var item: BulkScanResultItem?
    private(set) var isLoading = false
    private(set) var isUnresolved = false

    var confidence: Double { item?.confidence ?? 0 }
    var usedValue: Double? { item?.result.pricing.preferredUsedValue }
    var newValue: Double? { item?.result.pricing.preferredNewValue }

    init(
        id: String,
        boundingBox: NormalizedBoundingBox?,
        spatialNumber: Int,
        item: BulkScanResultItem? = nil
    ) {
        self.id = id
        self.boundingBox = boundingBox
        self.spatialNumber = spatialNumber
        self.item = item
    }

    init(id: String, item: BulkScanResultItem, spatialNumber: Int) {
        self.init(id: id, boundingBox: item.boundingBox, spatialNumber: spatialNumber, item: item)
    }

    var isTerminal: Bool { item != nil || isUnresolved }
    var isResolved: Bool { item != nil }

    func value(for condition: CollectionCondition) -> Double? {
        condition == .used ? usedValue : newValue
    }

    var confidenceTitle: String {
        confidence >= 0.8 ? "High confidence" : "Review match"
    }

    var priceSourceTitle: String {
        item?.result.pricing.dataSource == "sold"
            ? "Sold value"
            : "Estimated market value"
    }

    mutating func markLoading() {
        isLoading = true
        isUnresolved = false
    }

    mutating func resolve(_ item: BulkScanResultItem) {
        self.item = item
        isLoading = false
        isUnresolved = false
    }

    mutating func markUnresolved() {
        item = nil
        isLoading = false
        isUnresolved = true
    }
}

struct BulkRevealSession: Sendable {
    static let minimumDuration: TimeInterval = 3.0
    static let maximumDuration: TimeInterval = 30.0

    private(set) var entries: [BulkRevealEntry]
    private(set) var phase: BulkRevealPhase = .preparing
    private(set) var revealedCount = 0
    private(set) var condition: CollectionCondition = .used

    init(regions: [BulkScanRegion], items: [BulkScanResultItem] = []) {
        let orderedRegions = regions.sorted { lhs, rhs in
            let rowDelta = lhs.boundingBox.y - rhs.boundingBox.y
            return abs(rowDelta) > 0.10
                ? rowDelta < 0
                : lhs.boundingBox.x < rhs.boundingBox.x
        }
        let itemsByID = Dictionary(uniqueKeysWithValues: items.map { ($0.id, $0) })
        entries = orderedRegions.enumerated().map { index, region in
            BulkRevealEntry(
                id: region.regionId,
                boundingBox: region.boundingBox,
                spatialNumber: index + 1,
                item: itemsByID[region.regionId]
            )
        }
    }

    init(items: [BulkScanResultItem]) {
        let regions = items.map {
            BulkScanRegion(
                regionId: $0.id,
                boundingBox: $0.boundingBox ?? NormalizedBoundingBox(x: 0, y: 0, width: 0, height: 0)
            )
        }
        self.init(regions: regions, items: items)
    }

    var isComplete: Bool {
        if case .finalSummary = phase { return true }
        return false
    }

    var currentEntry: BulkRevealEntry? {
        guard case .sweeping(let index) = phase, entries.indices.contains(index) else { return nil }
        return entries[index]
    }

    var canAdvanceCurrentEntry: Bool { currentEntry?.isTerminal == true }
    var activeEntry: BulkRevealEntry? { currentEntry }

    var revealedEntries: ArraySlice<BulkRevealEntry> {
        entries.prefix(revealedCount)
    }

    var revealedTotal: Double {
        revealedEntries.compactMap { $0.value(for: condition) }.reduce(0, +)
    }

    var stepInterval: TimeInterval { Self.stepInterval(for: entries.count) }

    static func stepInterval(for itemCount: Int) -> TimeInterval {
        switch itemCount {
        case 0...5: 0.70
        case 6...20: 0.60
        default: 0.50
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

    mutating func markLoading(_ id: String) {
        guard let index = entries.firstIndex(where: { $0.id == id }) else { return }
        entries[index].markLoading()
    }

    mutating func resolve(_ item: BulkScanResultItem) {
        guard let index = entries.firstIndex(where: { $0.id == item.id }) else { return }
        entries[index].resolve(item)
    }

    mutating func markUnresolved(_ id: String) {
        guard let index = entries.firstIndex(where: { $0.id == id }) else { return }
        entries[index].markUnresolved()
    }

    mutating func commitSweepStep() {
        guard case .sweeping(let index) = phase,
              index == revealedCount,
              entries.indices.contains(index),
              entries[index].isTerminal
        else { return }
        revealedCount += 1
        if revealedCount >= entries.count {
            phase = .finalSummary
        } else {
            phase = .sweeping(index: revealedCount)
        }
    }

    mutating func commitActiveEntry() { commitSweepStep() }

    mutating func reset() {
        revealedCount = 0
        phase = .preparing
    }

    mutating func setCondition(_ condition: CollectionCondition) {
        self.condition = condition
    }
}
