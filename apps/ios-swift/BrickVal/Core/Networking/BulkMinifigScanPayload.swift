import Foundation

struct BulkMinifigScanPayload: Decodable, Sendable {
    let items: [Item]
    let unresolvedCount: Int
    let partial: Bool
    let timings: Timings
    let usage: UsageSnapshot?

    struct Item: Decodable, Sendable {
        let detection: IdentificationDetection
        let result: MinifigLookupPayload

        var normalized: BulkScanResultItem {
            BulkScanResultItem(
                id: detection.regionID ?? detection.id,
                result: result.normalized,
                boundingBox: detection.boundingBox?.normalized
            )
        }
    }

    struct Timings: Decodable, Sendable {
        let preprocessingMilliseconds: Int?
        let identificationMilliseconds: Int?
        let pricingMilliseconds: Int?
        let totalMilliseconds: Int?
        let providerRequests: Int?

        enum CodingKeys: String, CodingKey {
            case preprocessingMilliseconds = "preprocessing_ms"
            case identificationMilliseconds = "identification_ms"
            case pricingMilliseconds = "pricing_ms"
            case totalMilliseconds = "total_ms"
            case providerRequests = "provider_requests"
        }
    }

    enum CodingKeys: String, CodingKey {
        case items
        case unresolvedCount = "unresolvedCount"
        case partial
        case timings
        case usage
    }
}

struct BulkScanRegion: Encodable, Sendable {
    let regionId: String
    let boundingBox: NormalizedBoundingBox
}
