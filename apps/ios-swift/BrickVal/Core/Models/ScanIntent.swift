import Foundation

enum ScanIntent: String, CaseIterable, Identifiable, Sendable {
    case single
    case bulk

    var id: Self { self }

    var title: String {
        switch self {
        case .single: "Minifigure"
        case .bulk: "Bulk"
        }
    }
}
