import SwiftUI

enum ThemePreference: String, CaseIterable, Identifiable, Sendable {
    case system
    case dark
    case light

    var id: Self { self }
    var title: String { rawValue.capitalized }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .dark: .dark
        case .light: .light
        }
    }
}
