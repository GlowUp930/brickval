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
                boundingBox: detection.boundingBox?.normalized,
                confidence: detection.score
            )
        }
    }

    struct ReviewItem: Decodable, Sendable {
        let detection: IdentificationDetection
        let candidates: [Candidate]

        var bestResultItem: BulkScanResultItem? {
            guard let candidate = bestCandidate else { return nil }
            return BulkScanResultItem(
                id: detection.regionID ?? detection.id,
                result: candidate.result.normalized,
                boundingBox: detection.boundingBox?.normalized,
                confidence: candidate.score
            )
        }

        private var bestCandidate: Candidate? {
            let priced = candidates.filter {
                let pricing = $0.result.pricing
                return pricing.preferredUsedValue != nil || pricing.preferredNewValue != nil
            }
            return (priced.isEmpty ? candidates : priced).max(by: { $0.score < $1.score })
        }

        struct Candidate: Decodable, Sendable {
            let id: String
            let score: Double
            let result: MinifigLookupPayload
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

struct BulkScanStartPayload: Decodable, Sendable {
    let scanSource: BulkScanSource
    let regions: [BulkScanRegion]
    let sessionToken: String
    let recoveryToken: String?
    let proposalSource: String?
}

struct BulkRegionIdentificationPayload: Decodable, Sendable {
    let regionId: String
    let status: Status
    let candidates: [Candidate]
    let usage: UsageSnapshot?

    enum Status: String, Decodable, Sendable {
        case matched
        case review
        case unresolved
    }

    struct Candidate: Decodable, Sendable {
        let id: String
        let score: Double
        let result: MinifigLookupPayload

        var normalized: BulkScanReviewCandidate {
            BulkScanReviewCandidate(identifier: id, score: score, result: result.normalized)
        }
    }

    var bestCandidate: Candidate? {
        let priced = candidates.filter {
            let pricing = $0.result.pricing
            return pricing.preferredUsedValue != nil || pricing.preferredNewValue != nil
        }
        return (priced.isEmpty ? candidates : priced).max(by: { $0.score < $1.score })
    }

    enum CodingKeys: String, CodingKey {
        case regionId
        case status
        case candidates
        case usage
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        regionId = try container.decode(String.self, forKey: .regionId)
        status = try container.decodeIfPresent(Status.self, forKey: .status) ?? .unresolved
        candidates = try container.decodeIfPresent([Candidate].self, forKey: .candidates) ?? []
        usage = try container.decodeIfPresent(UsageSnapshot.self, forKey: .usage)
    }
}
