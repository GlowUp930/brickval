import SwiftUI

enum ThemePreference: String, CaseIterable, Identifiable, Sendable {
    case system
    case dark
    case light

    var id: Self { self }
    var title: String {
        switch self {
        case .system: BrickValLocalization.localized("System")
        case .dark: BrickValLocalization.localized("Dark")
        case .light: BrickValLocalization.localized("Light")
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .dark: .dark
        case .light: .light
        }
    }
}
