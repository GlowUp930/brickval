import SwiftUI

enum AccentPreference: String, CaseIterable, Identifiable, Sendable {
    case green
    case yellow
    case blue

    var id: Self { self }
    var title: String {
        switch self {
        case .green: BrickValLocalization.localized("Green")
        case .yellow: BrickValLocalization.localized("Yellow")
        case .blue: BrickValLocalization.localized("Blue")
        }
    }
    var color: Color {
        switch self {
        case .green: Color(red: 0.000, green: 0.784, blue: 0.020)
        case .yellow: Color(red: 0.949, green: 0.804, blue: 0.216)
        case .blue: Color(red: 0.259, green: 0.855, blue: 0.820)
        }
    }
}
