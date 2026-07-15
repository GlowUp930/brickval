import Foundation

struct IdentificationCandidate: Codable, Hashable, Identifiable, Sendable {
    let id: String
    let score: Double
}
