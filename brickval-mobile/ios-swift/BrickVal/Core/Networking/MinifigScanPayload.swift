import Foundation

struct MinifigScanPayload: Decodable, Sendable {
    let status: String
    let identification: IdentificationDetection?
    let detections: [IdentificationDetection]?
    let result: MinifigLookupPayload?
}
