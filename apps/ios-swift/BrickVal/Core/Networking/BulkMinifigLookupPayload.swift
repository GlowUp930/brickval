import Foundation

struct BulkMinifigLookupPayload: Decodable, Sendable {
    let results: [Row]
    let usage: UsageSnapshot?

    struct Row: Decodable, Sendable {
        let figNumber: String
        let result: MinifigLookupPayload?
        let error: String?

        var normalized: BulkMinifigLookupRow {
            BulkMinifigLookupRow(
                figNumber: figNumber,
                result: result?.normalized,
                wasFound: result != nil && error == nil
            )
        }
    }
}
