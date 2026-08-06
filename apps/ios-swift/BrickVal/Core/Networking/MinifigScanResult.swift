import Foundation

enum MinifigScanResult: Sendable {
    case matched(
        identification: IdentificationDetection,
        result: LookupResult,
        timings: MinifigScanTimings
    )
    case review([IdentificationDetection], timings: MinifigScanTimings)
    case notFound(timings: MinifigScanTimings)
}

struct MinifigScanTimings: Sendable {
    let identificationMilliseconds: Int?
    let pricingMilliseconds: Int?
    let totalMilliseconds: Int?
}
