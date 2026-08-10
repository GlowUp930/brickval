import Foundation

enum MinifigScanResult: Sendable {
    case matched(
        identification: IdentificationDetection,
        result: LookupResult,
        timings: MinifigScanTimings,
        usage: UsageSnapshot?
    )
    case review([IdentificationDetection], timings: MinifigScanTimings, usage: UsageSnapshot?)
    case notFound(timings: MinifigScanTimings)
}

struct MinifigScanTimings: Sendable {
    let identificationMilliseconds: Int?
    let pricingMilliseconds: Int?
    let totalMilliseconds: Int?
}
