import Foundation

struct PartColorOption: Codable, Hashable, Identifiable, Sendable {
    let colorID: Int
    let colorName: String

    var id: Int { colorID }

    enum CodingKeys: String, CodingKey {
        case colorID = "color_id"
        case colorName = "color_name"
    }
}
