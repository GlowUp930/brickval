import Foundation

enum CollectionFilter: String, CaseIterable, Identifiable {
    case all
    case sets
    case minifigs
    case parts

    var id: Self { self }
    var title: String { rawValue.capitalized }

    func includes(_ item: CollectionItem) -> Bool {
        switch self {
        case .all: true
        case .sets: item.itemType == .set
        case .minifigs: item.itemType == .minifig
        case .parts: item.itemType == .part
        }
    }
}
