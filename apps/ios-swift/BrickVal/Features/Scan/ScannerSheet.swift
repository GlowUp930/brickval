import Foundation
import Observation

enum ScannerSheet: Identifiable {
    case manualLookup
    case partColor(IdentificationDetection)
    case result(LookupResult)
    case review(ScanReview)

    var id: String {
        switch self {
        case .manualLookup: "manual-lookup"
        case .partColor(let detection): "part-color-\(detection.id)"
        case .result(let result): "result-\(result.id)"
        case .review(let review): "review-\(review.id.uuidString)"
        }
    }
}

enum BulkRegionProgressState: Sendable {
    case pending
    case loading
    case resolved(BulkScanResultItem)
    case unresolved(candidates: [BulkScanReviewCandidate])

    var isTerminal: Bool {
        switch self {
        case .resolved, .unresolved: true
        case .pending, .loading: false
        }
    }
}

enum BulkScanAccessMode: String, Sendable, Equatable {
    case real
    case lockedPreview
}

@Observable
@MainActor
final class BulkScanPresentation: Identifiable {
    let id = UUID()
    let imageData: Data
    let regions: [BulkScanRegion]
    let source: BulkScanSource
    let accessMode: BulkScanAccessMode
    let sessionToken: String?
    var recoveryToken: String?
    private(set) var regionStates: [String: BulkRegionProgressState]
    private(set) var revision = 0
    var terminalError: String?

    init(
        imageData: Data,
        regions: [BulkScanRegion],
        recoveryToken: String?,
        source: BulkScanSource,
        sessionToken: String? = nil,
        accessMode: BulkScanAccessMode = .real
    ) {
        self.imageData = imageData
        self.regions = regions
        self.recoveryToken = recoveryToken
        self.source = source
        self.sessionToken = sessionToken
        self.accessMode = accessMode
        regionStates = Dictionary(uniqueKeysWithValues: regions.map { ($0.regionId, .pending) })
    }

    convenience init(
        imageData: Data,
        items: [BulkScanResultItem],
        unresolvedRegions: [NormalizedBoundingBox],
        recoveryToken: String?,
        source: BulkScanSource
    ) {
        let emptyBox = NormalizedBoundingBox(x: 0, y: 0, width: 0, height: 0)
        var regions = items.map { BulkScanRegion(regionId: $0.id, boundingBox: $0.boundingBox ?? emptyBox) }
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
        for item in items {
            regionStates[item.id] = .resolved(item)
        }
        for index in unresolvedRegions.indices {
            regionStates["unresolved-\(index)"] = .unresolved(candidates: [])
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

    func markUnresolved(_ regionID: String, candidates: [BulkScanReviewCandidate] = []) {
        guard regionStates[regionID] != nil else { return }
        regionStates[regionID] = .unresolved(candidates: Array(candidates.prefix(3)))
        revision += 1
    }

    func candidates(for regionID: String) -> [BulkScanReviewCandidate] {
        switch regionStates[regionID] {
        case .resolved(let item): item.candidates
        case .unresolved(let candidates): candidates
        case .pending, .loading, .none: []
        }
    }
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
    let candidates: [BulkScanReviewCandidate]

    init(
        id: String,
        result: LookupResult,
        boundingBox: NormalizedBoundingBox?,
        confidence: Double = 0,
        candidates: [BulkScanReviewCandidate] = []
    ) {
        self.id = id
        self.result = result
        self.boundingBox = boundingBox
        self.confidence = confidence
        self.candidates = Array(candidates.prefix(3))
    }

    var orderedCandidates: [BulkScanReviewCandidate] {
        let current = BulkScanReviewCandidate(
            identifier: result.identifier,
            score: confidence,
            result: result
        )
        var ordered = [current]
        for candidate in candidates where !ordered.contains(where: { $0.id == candidate.id }) {
            ordered.append(candidate)
        }
        return Array(ordered.prefix(3))
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
                confidence: candidate.detection.score,
                candidates: [BulkScanReviewCandidate(
                    identifier: candidate.result.identifier,
                    score: candidate.detection.score,
                    result: candidate.result
                )]
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
