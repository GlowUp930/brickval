import Foundation

struct MinifigScanPayload: Decodable, Sendable {
    let status: String
    let identification: IdentificationDetection?
    let detections: [IdentificationDetection]?
    let result: MinifigLookupPayload?
    let identifyMs: Int?
    let pricingMs: Int?
    let totalMs: Int?
    let usage: UsageSnapshot?
    let pricingAvailability: String?
    let pricingUpdatedAt: String?
    let pricingResolution: String?

    enum CodingKeys: String, CodingKey {
        case status
        case identification
        case detections
        case result
        case identifyMs
        case pricingMs
        case totalMs
        case usage
        case pricingAvailability
        case pricingAvailabilitySnake = "pricing_availability"
        case pricingUpdatedAt
        case pricingUpdatedAtSnake = "pricing_updated_at"
        case pricingResolution
        case pricingResolutionSnake = "pricing_resolution"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        status = try container.decode(String.self, forKey: .status)
        identification = try container.decodeIfPresent(IdentificationDetection.self, forKey: .identification)
        detections = try container.decodeIfPresent([IdentificationDetection].self, forKey: .detections)
        result = try container.decodeIfPresent(MinifigLookupPayload.self, forKey: .result)
        identifyMs = try container.decodeIfPresent(Int.self, forKey: .identifyMs)
        pricingMs = try container.decodeIfPresent(Int.self, forKey: .pricingMs)
        totalMs = try container.decodeIfPresent(Int.self, forKey: .totalMs)
        usage = try container.decodeIfPresent(UsageSnapshot.self, forKey: .usage)
        let camelAvailability = try container.decodeIfPresent(String.self, forKey: .pricingAvailability)
        let snakeAvailability = try container.decodeIfPresent(String.self, forKey: .pricingAvailabilitySnake)
        pricingAvailability = camelAvailability ?? snakeAvailability
        let camelUpdatedAt = try container.decodeIfPresent(String.self, forKey: .pricingUpdatedAt)
        let snakeUpdatedAt = try container.decodeIfPresent(String.self, forKey: .pricingUpdatedAtSnake)
        pricingUpdatedAt = camelUpdatedAt ?? snakeUpdatedAt
        let camelResolution = try container.decodeIfPresent(String.self, forKey: .pricingResolution)
        let snakeResolution = try container.decodeIfPresent(String.self, forKey: .pricingResolutionSnake)
        pricingResolution = camelResolution ?? snakeResolution
    }

    var timings: MinifigScanTimings {
        MinifigScanTimings(
            identificationMilliseconds: identifyMs,
            pricingMilliseconds: pricingMs,
            totalMilliseconds: totalMs
        )
    }
}
