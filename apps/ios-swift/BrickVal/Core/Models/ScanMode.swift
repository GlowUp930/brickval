import Foundation

enum ScanMode: String, CaseIterable, Identifiable, Sendable {
    case set
    case minifig

    var id: Self { self }

    var title: String {
        switch self {
        case .set: "LEGO set"
        case .minifig: "Minifigure"
        }
    }
}
