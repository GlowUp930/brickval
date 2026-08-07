import SwiftUI

private struct BrickValAccentKey: EnvironmentKey {
    static let defaultValue = AccentPreference.green.color
}

extension EnvironmentValues {
    var brickValAccent: Color {
        get { self[BrickValAccentKey.self] }
        set { self[BrickValAccentKey.self] = newValue }
    }
}

enum BrickValStyle {
    // Raw values. Features should consume Semantic or component tokens below.
    enum Primitive {
        static let white = Color.white
        static let black = Color.black
        static let gray50 = Color(red: 0.969, green: 0.969, blue: 0.969)
        static let gray200 = Color(red: 0.902, green: 0.902, blue: 0.902)
        static let gray400 = Color(red: 0.620, green: 0.620, blue: 0.650)
        static let gray600 = Color(red: 0.361, green: 0.380, blue: 0.400)
        static let gray800 = Color(red: 0.125, green: 0.125, blue: 0.135)
        static let gray900 = Color(red: 0.055, green: 0.055, blue: 0.063)
        static let brandInk = Color(red: 0.125, green: 0.106, blue: 0.145)
        static let green500 = Color(red: 0.000, green: 0.784, blue: 0.020)
        static let orange500 = Color(red: 1.000, green: 0.314, blue: 0.000)
        static let legoYellow = Color(red: 1.000, green: 0.808, blue: 0.000)
        static let legoYellowDeep = Color(red: 0.965, green: 0.643, blue: 0.000)
        static let legoRed = Color(red: 0.780, green: 0.000, blue: 0.000)
        static let legoBlue = Color(red: 0.000, green: 0.337, blue: 0.804)

        static let space4 = 4.0
        static let space8 = 8.0
        static let space12 = 12.0
        static let space16 = 16.0
        static let space20 = 20.0
        static let space24 = 24.0
        static let space32 = 32.0

        static let radius12 = 12.0
        static let radius16 = 16.0
    }

    enum Semantic {
        static let canvas = Color(.systemBackground)
        static let surfaceMuted = Color(.secondarySystemBackground)
        static let divider = Color(.separator)
        static let textPrimary = Color(.label)
        static let textSecondary = Color(.secondaryLabel)
        static let valuePositive = Primitive.green500
        static let valueNegative = Primitive.orange500
        static let builderYellow = Primitive.legoYellow
        static let builderYellowDeep = Primitive.legoYellowDeep
        static let builderRed = Primitive.legoRed
        static let builderBlue = Primitive.legoBlue
        static let inverseCanvas = Primitive.gray900
        static let inverseSurface = Primitive.gray800
        static let inverseTextPrimary = Primitive.white
        static let inverseTextSecondary = Primitive.gray400
    }

    enum CollectionLayout {
        static let pageInset = Primitive.space20
        static let headerTop = Primitive.space12
        static let heroTop = Primitive.space32
        static let chartTop = Primitive.space24
        static let chartHeight = 248.0
        static let timelineHeight = 36.0
        static let sectionTop = Primitive.space32
        static let gridGap = Primitive.space12
        static let cardRadius = Primitive.radius12
        static let productImageHeight = 116.0
        static let minimumTapTarget = 44.0
    }

    enum ScanResult {
        static let canvas = Semantic.inverseCanvas
        static let surface = Semantic.inverseSurface
        static let textPrimary = Semantic.inverseTextPrimary
        static let textSecondary = Semantic.inverseTextSecondary
        static let accent = Semantic.valuePositive
        static let border = Primitive.white.opacity(0.14)
        static let chartFill = Semantic.valuePositive.opacity(0.16)
        static let retailAbove = Semantic.valuePositive
        static let retailBelow = Semantic.valueNegative
        static let retailBadgeSurface = Primitive.white.opacity(0.055)

        static let pageInset = Primitive.space20
        static let sectionGap = Primitive.space24
        static let imageHeight = 250.0
        static let chartHeight = 230.0
        static let controlHeight = 52.0
        static let cardRadius = Primitive.radius16
        static let buttonRadius = Primitive.radius12
    }

    // Compatibility aliases used by the remaining native screens.
    static let cardRadius = Primitive.radius16
    static let pageSpacing = Primitive.space16
    static let sectionSpacing = Primitive.space24
}
