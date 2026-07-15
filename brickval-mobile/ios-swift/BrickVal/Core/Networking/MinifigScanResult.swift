import Foundation

enum MinifigScanResult: Sendable {
    case matched(identification: IdentificationDetection, result: LookupResult)
    case review([IdentificationDetection])
    case notFound
}
