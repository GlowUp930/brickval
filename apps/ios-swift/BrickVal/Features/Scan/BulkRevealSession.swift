import Foundation

enum BulkRevealPhase: Equatable, Sendable {
    case preparing
    case sweeping(index: Int)
    case finalSummary
}

enum BulkRevealVisualStage: Equatable, Sendable {
    case scanning
    case waiting
    case presentingValue
    case transferringValue
    case jackpot
    case completed
}

struct BulkRevealEntry: Identifiable, Sendable {
    let id: String
    let boundingBox: NormalizedBoundingBox?
    let spatialNumber: Int
    private(set) var item: BulkScanResultItem?
    private(set) var isLoading = false
    private(set) var isUnresolved = false
    private(set) var isPreviewOnly = false

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

    var isTerminal: Bool { item != nil || isUnresolved || isPreviewOnly }
    var isResolved: Bool { item != nil }

    var beamProgress: Double {
        guard let boundingBox else { return 0 }
        return min(max(boundingBox.y + boundingBox.height / 2, 0), 1)
    }

    func value(for condition: CollectionCondition) -> Double? {
        condition == .used ? usedValue : newValue
    }

    var priceSourceTitle: String {
        MarketPriceSourceCopy.title(for: item?.result.pricing.dataSource)
    }

    mutating func markLoading() {
        isPreviewOnly = false
        isLoading = true
        isUnresolved = false
    }

    mutating func resolve(_ item: BulkScanResultItem) {
        self.item = item
        isLoading = false
        isUnresolved = false
        isPreviewOnly = false
    }

    mutating func markUnresolved() {
        item = nil
        isLoading = false
        isUnresolved = true
        isPreviewOnly = false
    }

    mutating func markPreviewOnly() {
        item = nil
        isLoading = false
        isUnresolved = false
        isPreviewOnly = true
    }

    mutating func clearPreviewOnly() {
        isPreviewOnly = false
    }
}

struct BulkRevealSession: Sendable {
    static let scanPassDuration: TimeInterval = 1.60
    static let targetValueRevealDuration: TimeInterval = 16.80
    static let jackpotDuration: TimeInterval = 1.40
    static let returnDuration: TimeInterval = 0.45
    static let unavailableHoldDuration: TimeInterval = 0.55
    static let valueTransferDuration: TimeInterval = 0.42
    static let minimumStepInterval: TimeInterval = 0.42
    static let maximumStepInterval: TimeInterval = 0.75
    static let minimumDuration: TimeInterval = 3.0
    static let maximumDuration: TimeInterval = 30.0

    private(set) var entries: [BulkRevealEntry]
    private(set) var phase: BulkRevealPhase = .preparing
    private(set) var revealedCount = 0
    private(set) var lastRevealedEntryID: String?
    private(set) var beamProgress = 0.0
    private(set) var condition: CollectionCondition = .used
    private(set) var isPreviewOnly = false

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

    var lastRevealedEntry: BulkRevealEntry? {
        guard let lastRevealedEntryID else { return nil }
        return entries.first { $0.id == lastRevealedEntryID }
    }

    var topPricedEntry: BulkRevealEntry? {
        revealedEntries
            .compactMap { entry -> (BulkRevealEntry, Double)? in
                guard let value = entry.value(for: condition) else { return nil }
                return (entry, value)
            }
            .max { $0.1 < $1.1 }?.0
    }

    var pricedCount: Int {
        revealedEntries.filter { $0.value(for: condition) != nil }.count
    }

    var stepInterval: TimeInterval { Self.stepInterval(for: entries.count) }

    static func stepInterval(for itemCount: Int) -> TimeInterval {
        guard itemCount > 0 else { return maximumStepInterval }
        return min(
            maximumStepInterval,
            max(minimumStepInterval, targetValueRevealDuration / Double(itemCount))
        )
    }

    var duration: TimeInterval {
        guard !entries.isEmpty else { return Self.minimumDuration }
        let scan = Self.scanPassDuration
        let outro = Self.jackpotDuration + Self.returnDuration
        return min(
            Self.maximumDuration,
            max(Self.minimumDuration, scan + stepInterval * Double(entries.count) + outro)
        )
    }

    mutating func begin() {
        guard !entries.isEmpty else {
            phase = .finalSummary
            return
        }
        revealedCount = 0
        lastRevealedEntryID = nil
        beamProgress = 0
        phase = .sweeping(index: 0)
    }

    mutating func beginPreview() {
        isPreviewOnly = true
        for index in entries.indices {
            entries[index].markPreviewOnly()
        }
        begin()
    }

    mutating func setBeamProgress(_ progress: Double) {
        beamProgress = min(max(progress, 0), 1)
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
        lastRevealedEntryID = entries[index].id
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
        lastRevealedEntryID = nil
        beamProgress = 0
        isPreviewOnly = false
        for index in entries.indices {
            entries[index].clearPreviewOnly()
        }
        phase = .preparing
    }

    mutating func setCondition(_ condition: CollectionCondition) {
        self.condition = condition
    }
}
