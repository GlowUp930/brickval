import Foundation

struct ScanReviewCandidate: Identifiable, Sendable {
    let identifier: String
    let score: Double
    let result: LookupResult?

    var id: String { identifier.lowercased() }

    static func make(from detections: [IdentificationDetection]) -> [ScanReviewCandidate] {
        var seen = Set<String>()
        var candidates: [ScanReviewCandidate] = []

        for detection in detections where detection.itemType == .minifig {
            append(
                identifier: detection.id,
                score: detection.score,
                seen: &seen,
                candidates: &candidates
            )
            for alternative in detection.alternatives ?? [] {
                append(
                    identifier: alternative.id,
                    score: alternative.score,
                    seen: &seen,
                    candidates: &candidates
                )
            }
            if candidates.count >= 3 { break }
        }

        return Array(candidates.prefix(3))
    }

    static func applying(
        _ rows: [BulkMinifigLookupRow],
        to candidates: [ScanReviewCandidate]
    ) -> [ScanReviewCandidate] {
        let results = rows.reduce(into: [String: LookupResult]()) { results, row in
            guard let result = row.result else { return }
            results[row.figNumber.lowercased()] = result
        }
        return candidates.map { candidate in
            ScanReviewCandidate(
                identifier: candidate.identifier,
                score: candidate.score,
                result: results[candidate.identifier.lowercased()]
            )
        }
    }

    private static func append(
        identifier: String,
        score: Double,
        seen: inout Set<String>,
        candidates: inout [ScanReviewCandidate]
    ) {
        guard candidates.count < 3 else { return }
        let normalized = identifier.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !normalized.isEmpty, seen.insert(normalized).inserted else { return }
        candidates.append(ScanReviewCandidate(identifier: normalized, score: score, result: nil))
    }
}
