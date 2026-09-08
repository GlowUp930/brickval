import Foundation

enum ScanIntent: String, CaseIterable, Identifiable, Sendable {
    case single
    case bulk

    var id: Self { self }

    var title: String {
        switch self {
        case .single: BrickValLocalization.localized("Minifigure")
        case .bulk: BrickValLocalization.localized("Bulk")
        }
    }

    var iconName: String {
        switch self {
        case .single: "person.crop.rectangle"
        case .bulk: "square.stack.3d.up"
        }
    }
}
