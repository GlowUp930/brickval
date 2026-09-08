import Foundation

enum PortfolioHorizon: String, CaseIterable, Identifiable {
    case month = "1M"
    case quarter = "3M"
    case half = "6M"

    var id: Self { self }

    var days: Int {
        switch self {
        case .month: 30
        case .quarter: 90
        case .half: 180
        }
    }

    var displayName: String { rawValue }

    var summaryLabel: String { BrickValLocalization.localized("Past \(rawValue)") }
}
