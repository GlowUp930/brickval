import Foundation

enum CollectionCondition: String, Codable, CaseIterable, Sendable {
    case newSealed = "new_sealed"
    case used

    var title: String {
        switch self {
        case .newSealed: BrickValLocalization.localized("New / sealed")
        case .used: BrickValLocalization.localized("Used")
        }
    }
}
