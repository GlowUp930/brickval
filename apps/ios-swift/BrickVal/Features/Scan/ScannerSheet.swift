import Foundation

enum ScannerSheet: Identifiable {
    case manualLookup
    case partColor(IdentificationDetection)
    case bulkResults(imageData: Data, items: [BulkScanResultItem])
    case result(LookupResult)
    case review(ScanReview)

    var id: String {
        switch self {
        case .manualLookup: "manual-lookup"
        case .partColor(let detection): "part-color-\(detection.id)"
        case .bulkResults(_, let items):
            "bulk-\(items.map(\.id).joined(separator: ","))"
        case .result(let result): "result-\(result.id)"
        case .review(let review): "review-\(review.id.uuidString)"
        }
    }
}

struct BulkScanResultItem: Identifiable, Sendable {
    let id: String
    let result: LookupResult
    let boundingBox: NormalizedBoundingBox?

    static func make(
        detections: [IdentificationDetection],
        results: [LookupResult]
    ) -> [BulkScanResultItem] {
        let resultsByIdentifier = Dictionary(
            uniqueKeysWithValues: results.map { ($0.identifier.lowercased(), $0) }
        )
        return detections.enumerated().compactMap { index, detection in
            guard detection.itemType == .minifig,
                  let result = resultsByIdentifier[detection.id.lowercased()]
            else { return nil }
            return BulkScanResultItem(
                id: detection.regionID ?? "\(detection.id)-\(index)",
                result: result,
                boundingBox: detection.boundingBox?.normalized
            )
        }
    }
}
