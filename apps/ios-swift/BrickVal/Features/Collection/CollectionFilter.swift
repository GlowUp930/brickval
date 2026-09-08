import Foundation

enum CollectionFilter: String, CaseIterable, Identifiable {
    case all
    case sets
    case minifigs

    var id: Self { self }
    var title: String {
        switch self {
        case .all: BrickValLocalization.localized("All")
        case .sets: BrickValLocalization.localized("Sets")
        case .minifigs: BrickValLocalization.localized("Minifigures")
        }
    }

    func includes(_ item: CollectionDisplayItem) -> Bool {
        switch self {
        case .all: true
        case .sets: item.itemType == .set
        case .minifigs: item.itemType == .minifig
        }
    }
}
