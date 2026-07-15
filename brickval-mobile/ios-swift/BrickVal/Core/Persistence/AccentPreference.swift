import SwiftUI

enum AccentPreference: String, CaseIterable, Identifiable, Sendable {
    case yellow
    case blue

    var id: Self { self }
    var title: String { rawValue.capitalized }
    var color: Color { self == .yellow ? Color(red: 0.949, green: 0.804, blue: 0.216) : Color(red: 0.259, green: 0.855, blue: 0.82) }
}
