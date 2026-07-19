import Foundation

enum PrimaryGoal: String, CaseIterable, Identifiable, Sendable {
    case catalog
    case resell
    case dealCheck = "deal_check"

    var id: Self { self }

    var title: String {
        switch self {
        case .catalog: "Track my collection"
        case .resell: "Buy and resell"
        case .dealCheck: "Check prices quickly"
        }
    }
}
