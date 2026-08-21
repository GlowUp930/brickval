import Foundation
import Observation

enum ScannerSheet: Identifiable {
    case manualLookup
    case partColor(IdentificationDetection)
    case bulkResults(
        imageData: Data,
        items: [BulkScanResultItem],
        reviewItems: [BulkScanReviewItem],
        unresolvedRegions: [NormalizedBoundingBox],
        recoveryToken: String?
    )
    case result(LookupResult)
    case review(ScanReview)

    var id: String {
        switch self {
        case .manualLookup: "manual-lookup"
        case .partColor(let detection): "part-color-\(detection.id)"
        case .bulkResults(_, let items, let reviewItems, _, _):
            "bulk-\((items.map(\.id) + reviewItems.map(\.id)).joined(separator: ","))"
        case .result(let result): "result-\(result.id)"
        case .review(let review): "review-\(review.id.uuidString)"
        }
    }
}

enum BulkRegionProgressState: Sendable {
    case pending
    case loading
    case resolved(BulkScanResultItem)
    case unresolved

    var isTerminal: Bool {
        switch self {
        case .resolved, .unresolved: true
        case .pending, .loading: false
        }
    }
}

@Observable
@MainActor
final class BulkScanPresentation: Identifiable {
    let id = UUID()
    let imageData: Data
    let regions: [BulkScanRegion]
    let source: BulkScanSource
    let sessionToken: String?
    var recoveryToken: String?
    private(set) var reviewItems: [BulkScanReviewItem]
    private(set) var regionStates: [String: BulkRegionProgressState]
    private(set) var revision = 0
    var terminalError: String?

    init(
        imageData: Data,
        regions: [BulkScanRegion],
        recoveryToken: String?,
        source: BulkScanSource,
        sessionToken: String? = nil
    ) {
        self.imageData = imageData
        self.regions = regions
        self.recoveryToken = recoveryToken
        self.source = source
        self.sessionToken = sessionToken
        reviewItems = []
        regionStates = Dictionary(uniqueKeysWithValues: regions.map { ($0.regionId, .pending) })
    }

    convenience init(
        imageData: Data,
        items: [BulkScanResultItem],
        reviewItems: [BulkScanReviewItem],
        unresolvedRegions: [NormalizedBoundingBox],
        recoveryToken: String?,
        source: BulkScanSource
    ) {
        let emptyBox = NormalizedBoundingBox(x: 0, y: 0, width: 0, height: 0)
        var regions = items.map { BulkScanRegion(regionId: $0.id, boundingBox: $0.boundingBox ?? emptyBox) }
        for review in reviewItems where !regions.contains(where: { $0.regionId == review.id }) {
            regions.append(BulkScanRegion(regionId: review.id, boundingBox: review.boundingBox ?? emptyBox))
        }
        for (index, box) in unresolvedRegions.enumerated() {
            let regionID = "unresolved-\(index)"
            guard !regions.contains(where: { $0.regionId == regionID }) else { continue }
            regions.append(BulkScanRegion(regionId: regionID, boundingBox: box))
        }
        self.init(
            imageData: imageData,
            regions: regions,
            recoveryToken: recoveryToken,
            source: source
        )
        self.reviewItems = reviewItems
        for item in items {
            regionStates[item.id] = .resolved(item)
        }
        for review in reviewItems {
            regionStates[review.id] = .unresolved
        }
        for index in unresolvedRegions.indices {
            regionStates["unresolved-\(index)"] = .unresolved
        }
        revision += 1
    }

    var resolvedItems: [BulkScanResultItem] {
        regions.compactMap { region in
            guard case .resolved(let item) = regionStates[region.regionId] else { return nil }
            return item
        }
    }

    var items: [BulkScanResultItem] { resolvedItems }

    var unresolvedRegions: [NormalizedBoundingBox] {
        regions.compactMap { region in
            guard case .unresolved = regionStates[region.regionId] else { return nil }
            return region.boundingBox
        }
    }

    var terminalCount: Int {
        regions.reduce(into: 0) { count, region in
            if regionStates[region.regionId]?.isTerminal == true { count += 1 }
        }
    }

    var isTerminal: Bool {
        !regions.isEmpty && terminalCount == regions.count
    }

    var successfulCount: Int { resolvedItems.count }

    func markLoading(_ regionID: String) {
        guard regionStates[regionID] != nil else { return }
        regionStates[regionID] = .loading
        revision += 1
    }

    func markResolved(_ item: BulkScanResultItem) {
        guard regionStates[item.id] != nil else { return }
        regionStates[item.id] = .resolved(item)
        revision += 1
    }

    func markUnresolved(_ regionID: String) {
        guard regionStates[regionID] != nil else { return }
        regionStates[regionID] = .unresolved
        revision += 1
    }
}

struct BulkScanReviewItem: Identifiable, Sendable {
    let id: String
    let boundingBox: NormalizedBoundingBox?
    let candidates: [BulkScanReviewCandidate]
}

struct BulkScanReviewCandidate: Identifiable, Sendable {
    let identifier: String
    let score: Double
    let result: LookupResult

    var id: String { identifier.lowercased() }
}

struct BulkScanResultItem: Identifiable, Sendable {
    let id: String
    let result: LookupResult
    let boundingBox: NormalizedBoundingBox?
    let confidence: Double

    init(
        id: String,
        result: LookupResult,
        boundingBox: NormalizedBoundingBox?,
        confidence: Double = 0
    ) {
        self.id = id
        self.result = result
        self.boundingBox = boundingBox
        self.confidence = confidence
    }

    private struct Candidate {
        let index: Int
        let detection: IdentificationDetection
        let result: LookupResult
        let boundingBox: NormalizedBoundingBox?
    }

    static func make(
        detections: [IdentificationDetection],
        results: [LookupResult]
    ) -> [BulkScanResultItem] {
        let resultsByIdentifier = Dictionary(
            uniqueKeysWithValues: results.map { ($0.identifier.lowercased(), $0) }
        )
        let candidates = detections.enumerated().compactMap { index, detection -> Candidate? in
            guard detection.itemType == .minifig,
                  let result = resultsByIdentifier[detection.id.lowercased()]
            else { return nil }

            return Candidate(
                index: index,
                detection: detection,
                result: result,
                boundingBox: detection.boundingBox?.normalized
            )
        }

        var kept: [Candidate] = []
        let confidenceOrderedCandidates = candidates.sorted {
            if $0.detection.score == $1.detection.score {
                return $0.index < $1.index
            }
            return $0.detection.score > $1.detection.score
        }

        for candidate in confidenceOrderedCandidates {
            let duplicatesExistingDetection = kept.contains { existing in
                guard candidate.result.identifier.caseInsensitiveCompare(existing.result.identifier) == .orderedSame,
                      let candidateBox = candidate.boundingBox,
                      let existingBox = existing.boundingBox
                else { return false }
                return overlapOfSmallerBox(candidateBox, existingBox) >= 0.8
            }

            if !duplicatesExistingDetection {
                kept.append(candidate)
            }
        }

        return kept.sorted(by: { $0.index < $1.index }).map { candidate in
            BulkScanResultItem(
                id: candidate.detection.regionID ?? "\(candidate.detection.id)-\(candidate.index)",
                result: candidate.result,
                boundingBox: candidate.boundingBox,
                confidence: candidate.detection.score
            )
        }
    }

    private static func overlapOfSmallerBox(
        _ lhs: NormalizedBoundingBox,
        _ rhs: NormalizedBoundingBox
    ) -> Double {
        let intersectionWidth = max(0, min(lhs.x + lhs.width, rhs.x + rhs.width) - max(lhs.x, rhs.x))
        let intersectionHeight = max(0, min(lhs.y + lhs.height, rhs.y + rhs.height) - max(lhs.y, rhs.y))
        let smallerArea = min(lhs.area, rhs.area)

        guard smallerArea > 0 else { return 0 }
        return intersectionWidth * intersectionHeight / smallerArea
    }
}
