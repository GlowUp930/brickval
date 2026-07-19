import Foundation

enum ScannerSheet: Identifiable {
    case manualLookup
    case partColor(IdentificationDetection)
    case bulkResults(results: [LookupResult], unresolved: [IdentificationDetection])
    case result(LookupResult)
    case review(ScanReview)

    var id: String {
        switch self {
        case .manualLookup: "manual-lookup"
        case .partColor(let detection): "part-color-\(detection.id)"
        case .bulkResults(let results, let unresolved):
            "bulk-\(results.map(\.id).joined(separator: ","))-\(unresolved.map(\.id).joined(separator: ","))"
        case .result(let result): "result-\(result.id)"
        case .review(let review): "review-\(review.id.uuidString)"
        }
    }
}
