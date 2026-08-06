import Foundation

struct ScanReview: Identifiable {
    let id = UUID()
    let candidates: [ScanReviewCandidate]
}
