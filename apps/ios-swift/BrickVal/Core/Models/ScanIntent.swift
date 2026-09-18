import Foundation

enum ScanIntent: String, CaseIterable, Identifiable, Sendable {
    case single
    case bulk

    var id: Self { self }

    var titleResource: LocalizedStringResource {
        switch self {
        case .single: "Minifigure"
        case .bulk: "Bulk"
        }
    }

    var title: String {
        BrickValLocalization.localized(titleResource)
    }

    func title(locale: Locale) -> String {
        BrickValLocalization.localized(titleResource, locale: locale)
    }

    var iconName: String {
        switch self {
        case .single: "person.crop.rectangle"
        case .bulk: "square.stack.3d.up"
        }
    }
}
