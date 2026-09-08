import Foundation

enum PrimaryGoal: String, CaseIterable, Identifiable, Sendable {
    case catalog
    case resell
    case dealCheck = "deal_check"

    var id: Self { self }

    var title: String {
        switch self {
        case .catalog: BrickValLocalization.localized("Track my collection")
        case .resell: BrickValLocalization.localized("Buy and resell")
        case .dealCheck: BrickValLocalization.localized("Check prices quickly")
        }
    }
}
