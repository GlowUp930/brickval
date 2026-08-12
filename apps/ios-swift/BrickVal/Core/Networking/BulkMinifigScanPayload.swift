import Foundation

struct BulkMinifigScanPayload: Decodable, Sendable {
    let items: [Item]
    let reviewItems: [ReviewItem]
    let unresolvedRegions: [BulkScanRegion]
    let unresolvedCount: Int
    let partial: Bool
    let timings: Timings
    let usage: UsageSnapshot?
    let recoveryToken: String?

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

    struct ReviewItem: Decodable, Sendable {
        let detection: IdentificationDetection
        let candidates: [Candidate]

        struct Candidate: Decodable, Sendable {
            let id: String
            let score: Double
            let result: MinifigLookupPayload

            var normalized: BulkScanReviewCandidate {
                BulkScanReviewCandidate(identifier: id, score: score, result: result.normalized)
            }
        }

        var normalized: BulkScanReviewItem {
            BulkScanReviewItem(
                id: detection.regionID ?? detection.id,
                boundingBox: detection.boundingBox?.normalized,
                candidates: candidates.map(\.normalized)
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
        case reviewItems
        case unresolvedRegions
        case unresolvedCount = "unresolvedCount"
        case partial
        case timings
        case usage
        case recoveryToken
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        items = try container.decode([Item].self, forKey: .items)
        reviewItems = try container.decodeIfPresent([ReviewItem].self, forKey: .reviewItems) ?? []
        unresolvedRegions = try container.decodeIfPresent([BulkScanRegion].self, forKey: .unresolvedRegions) ?? []
        unresolvedCount = try container.decodeIfPresent(Int.self, forKey: .unresolvedCount) ?? unresolvedRegions.count
        partial = try container.decodeIfPresent(Bool.self, forKey: .partial) ?? false
        timings = try container.decode(Timings.self, forKey: .timings)
        usage = try container.decodeIfPresent(UsageSnapshot.self, forKey: .usage)
        recoveryToken = try container.decodeIfPresent(String.self, forKey: .recoveryToken)
    }
}

struct BulkScanRegion: Codable, Sendable {
    let regionId: String
    let boundingBox: NormalizedBoundingBox
}
