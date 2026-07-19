import Foundation

struct PartColorsPayload: Decodable, Sendable {
    let colors: [PartColorOption]
}
