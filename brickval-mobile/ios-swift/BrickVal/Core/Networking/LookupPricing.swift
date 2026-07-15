import Foundation

struct LookupPricing: Decodable, Sendable {
    let heroNewAverageUSD: Double?
    let rrpUSD: Double?
    let gainPercent: Double?
    let dataSource: String?
    let newSoldAverageUSD: Double?
    let usedSoldAverageUSD: Double?
    let newStockAverageUSD: Double?
    let usedStockAverageUSD: Double?
    let brickLinkNewAverageUSD: Double?
    let brickLinkUsedAverageUSD: Double?

    var preferredNewValue: Double? {
        heroNewAverageUSD ?? newSoldAverageUSD ?? brickLinkNewAverageUSD ?? newStockAverageUSD
    }

    var preferredUsedValue: Double? {
        usedSoldAverageUSD ?? brickLinkUsedAverageUSD ?? usedStockAverageUSD ?? preferredNewValue
    }

    enum CodingKeys: String, CodingKey {
        case heroNewAverageUSD = "hero_new_avg_usd"
        case rrpUSD = "rrp_usd"
        case gainPercent = "gain_pct"
        case dataSource = "data_source"
        case newSoldAverageUSD = "new_sold_avg_usd"
        case usedSoldAverageUSD = "used_sold_avg_usd"
        case newStockAverageUSD = "new_stock_avg_usd"
        case usedStockAverageUSD = "used_stock_avg_usd"
        case brickLinkNewAverageUSD = "bricklink_new_avg_usd"
        case brickLinkUsedAverageUSD = "bricklink_used_avg_usd"
    }
}
