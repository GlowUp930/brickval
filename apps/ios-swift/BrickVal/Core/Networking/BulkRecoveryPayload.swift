import Foundation

struct BulkRecoveryPayload: Decodable, Sendable {
    let candidates: [Candidate]

    struct Candidate: Decodable, Sendable {
        let id: String
        let score: Double
        let result: MinifigLookupPayload

        var normalized: BulkScanReviewCandidate {
            BulkScanReviewCandidate(identifier: id, score: score, result: result.normalized)
        }
    }
}
