import Foundation

struct BulkMinifigLookupRow: Identifiable, Sendable {
    let figNumber: String
    let result: LookupResult?
    let wasFound: Bool

    var id: String { figNumber }
}
