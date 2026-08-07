import SwiftUI
import UIKit

enum AvatarBackgroundPreference: String, CaseIterable, Identifiable, Sendable {
    case accent
    case charcoal
    case green
    case yellow
    case blue
    case red
    case lilac
    case custom

    var id: Self { self }

    var title: String {
        switch self {
        case .accent: "App accent"
        case .charcoal: "Charcoal"
        case .green: "Green"
        case .yellow: "Yellow"
        case .blue: "Blue"
        case .red: "Red"
        case .lilac: "Lilac"
        case .custom: "Custom"
        }
    }

    var color: Color {
        switch self {
        case .accent, .green: AccentPreference.green.color
        case .charcoal: Color(red: 0.12, green: 0.13, blue: 0.15)
        case .yellow: AccentPreference.yellow.color
        case .blue: AccentPreference.blue.color
        case .red: Color(red: 0.78, green: 0, blue: 0)
        case .lilac: Color(red: 0.55, green: 0.36, blue: 0.78)
        case .custom: AccentPreference.green.color
        }
    }
}

struct StoredAvatarColor: Codable, Equatable, Sendable {
    let red: Double
    let green: Double
    let blue: Double

    init(color: Color) {
        let uiColor = UIColor(color)
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 1

        if uiColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha) {
            self.red = Double(red)
            self.green = Double(green)
            self.blue = Double(blue)
        } else {
            let components = uiColor.cgColor.components ?? [0, 0, 0, 1]
            self.red = Double(components[safe: 0] ?? 0)
            self.green = Double(components[safe: 1] ?? components[safe: 0] ?? 0)
            self.blue = Double(components[safe: 2] ?? components[safe: 0] ?? 0)
        }
    }

    var color: Color {
        Color(red: red, green: green, blue: blue)
    }
}

private extension Array {
    subscript(safe index: Index) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
