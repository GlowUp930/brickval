import Foundation

struct MinifigScanPayload: Decodable, Sendable {
    let status: String
    let identification: IdentificationDetection?
    let detections: [IdentificationDetection]?
    let result: MinifigLookupPayload?
    let identifyMs: Int?
    let pricingMs: Int?
    let totalMs: Int?

    var timings: MinifigScanTimings {
        MinifigScanTimings(
            identificationMilliseconds: identifyMs,
            pricingMilliseconds: pricingMs,
            totalMilliseconds: totalMs
        )
    }
}
