import Foundation

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

struct BulkScanPresentation: Identifiable {
    let id = UUID()
    let imageData: Data
    let items: [BulkScanResultItem]
    let reviewItems: [BulkScanReviewItem]
    let unresolvedRegions: [NormalizedBoundingBox]
    let recoveryToken: String?
    let source: BulkScanSource
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
