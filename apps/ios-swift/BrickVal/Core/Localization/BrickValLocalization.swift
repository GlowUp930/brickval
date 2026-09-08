import Foundation

enum BrickValLanguage: String, CaseIterable, Identifiable, Sendable {
    case english = "en"
    case spanish = "es"
    case french = "fr"
    case german = "de"
    case italian = "it"
    case portugueseBrazil = "pt-BR"
    case dutch = "nl"
    case japanese = "ja"
    case korean = "ko"
    case simplifiedChinese = "zh-Hans"
    case traditionalChinese = "zh-Hant"
    case arabic = "ar"
    case hindi = "hi"

    var id: Self { self }

    var locale: Locale { Locale(identifier: rawValue) }

    var isRightToLeft: Bool { self == .arabic }

    /// The name shown in the language picker. Keeping these labels in their
    /// native script makes the choices recognisable even before a selection is
    /// applied.
    var displayName: String {
        switch self {
        case .english: "English"
        case .spanish: "Español"
        case .french: "Français"
        case .german: "Deutsch"
        case .italian: "Italiano"
        case .portugueseBrazil: "Português (Brasil)"
        case .dutch: "Nederlands"
        case .japanese: "日本語"
        case .korean: "한국어"
        case .simplifiedChinese: "简体中文"
        case .traditionalChinese: "繁體中文"
        case .arabic: "العربية"
        case .hindi: "हिन्दी"
        }
    }
}

enum BrickValLocalization {
    static let supportedLanguages = BrickValLanguage.allCases
    static let languageOverrideKey = "brickval_language_override"

    /// The language iOS selects from the device's preferred localization list.
    /// This remains the fallback whenever the user chooses System default.
    static let deviceLanguage: BrickValLanguage = language(
        forPreferredLocalizations: Bundle.main.preferredLocalizations
    )

    static var effectiveLanguage: BrickValLanguage {
        let override = UserDefaults.standard.string(forKey: languageOverrideKey)
            .flatMap(BrickValLanguage.init(rawValue:))
        return effectiveLanguage(for: override)
    }

    static func effectiveLanguage(for override: BrickValLanguage?) -> BrickValLanguage {
        override ?? deviceLanguage
    }

    /// Resolves a localized resource with the app's active language. SwiftUI
    /// views receive the same locale through the environment; this overload
    /// keeps strings produced by models, alerts, and accessibility values in
    /// sync with an in-app language choice.
    static func localized(
        _ resource: LocalizedStringResource,
        locale: Locale? = nil
    ) -> String {
        var localizedResource = resource
        localizedResource.locale = locale ?? effectiveLanguage.locale
        return String(localized: localizedResource)
    }

    /// Resolves Apple's ordered localization list for System default. The
    /// bundle list is already filtered to supported localizations on device,
    /// while this helper also covers simulator tests and region-specific
    /// identifiers such as `es-MX`.
    static func language(forPreferredLocalizations identifiers: [String]) -> BrickValLanguage {
        for identifier in identifiers {
            let normalized = identifier.replacingOccurrences(of: "_", with: "-")
            if let exact = supportedLanguages.first(where: {
                $0.rawValue.caseInsensitiveCompare(identifier) == .orderedSame ||
                    $0.rawValue.caseInsensitiveCompare(normalized) == .orderedSame
            }) {
                return exact
            }

            let components = normalized.split(separator: "-").map(String.init)
            guard let base = components.first?.lowercased() else { continue }

            if let baseMatch = supportedLanguages.first(where: { $0.rawValue.lowercased() == base }) {
                return baseMatch
            }

            if base == "pt" {
                return .portugueseBrazil
            }

            // iOS may report Chinese as a region-only identifier in tests or
            // older system versions; preserve the script distinction.
            if base == "zh" {
                let hasTraditionalRegion = components.dropFirst().contains {
                    ["TW", "HK", "MO", "Hant"].contains($0)
                }
                let hasSimplifiedRegion = components.dropFirst().contains {
                    ["CN", "SG", "MY", "Hans"].contains($0)
                }
                if hasTraditionalRegion { return .traditionalChinese }
                if hasSimplifiedRegion { return .simplifiedChinese }
            }
        }
        return .english
    }

    static var effectiveLanguageName: String {
        let language = effectiveLanguage
        return language.displayName
    }

    static var effectiveLanguageCode: String { effectiveLanguage.rawValue }
}
