import Foundation

struct LookupPricing: Codable, Hashable, Sendable {
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

    var ebayNewAverageUSD: Double? = nil
    var ebayUsedAverageUSD: Double? = nil
    var brickLinkStockNewAverageUSD: Double? = nil
    var brickLinkStockUsedAverageUSD: Double? = nil
    var heroUsedAverageUSD: Double? = nil
    var newDataSource: String? = nil
    var usedDataSource: String? = nil

    func source(for condition: CollectionCondition) -> String? {
        if condition == .used {
            if let usedDataSource { return usedDataSource }
            if usedSoldAverageUSD != nil || brickLinkUsedAverageUSD != nil { return "sold" }
            if ebayUsedAverageUSD != nil { return dataSource }
            if usedStockAverageUSD != nil || brickLinkStockUsedAverageUSD != nil { return "listing" }
        } else {
            if let newDataSource { return newDataSource }
            if newSoldAverageUSD != nil || brickLinkNewAverageUSD != nil { return "sold" }
            if ebayNewAverageUSD != nil { return dataSource }
            if newStockAverageUSD != nil || brickLinkStockNewAverageUSD != nil { return "listing" }
        }
        return dataSource
    }

    var preferredNewValue: Double? {
        heroNewAverageUSD ?? newSoldAverageUSD ?? brickLinkNewAverageUSD ?? ebayNewAverageUSD ?? newStockAverageUSD ?? brickLinkStockNewAverageUSD
    }

    var preferredUsedValue: Double? {
        heroUsedAverageUSD ?? usedSoldAverageUSD ?? brickLinkUsedAverageUSD ?? ebayUsedAverageUSD ?? usedStockAverageUSD ?? brickLinkStockUsedAverageUSD
    }

    enum CodingKeys: String, CodingKey {
        case ebayNewAverageUSD = "ebay_new_avg_usd"
        case ebayUsedAverageUSD = "ebay_used_avg_usd"
        case brickLinkStockNewAverageUSD = "bricklink_stock_new_avg_usd"
        case brickLinkStockUsedAverageUSD = "bricklink_stock_used_avg_usd"
        case heroUsedAverageUSD = "hero_used_avg_usd"
        case newDataSource = "new_data_source"
        case usedDataSource = "used_data_source"
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

enum MarketPriceSourceCopy {
    static func title(for dataSource: String?) -> String {
        switch dataSource {
        case "sold": BrickValLocalization.localized("Average sold price")
        case "listing": BrickValLocalization.localized("Average asking price")
        default: BrickValLocalization.localized("Average market price")
        }
    }

    static func detail(for dataSource: String?) -> String {
        switch dataSource {
        case "sold": BrickValLocalization.localized("Based on recent completed sales.")
        case "listing": BrickValLocalization.localized("Based on active listings—not completed sales.")
        default: BrickValLocalization.localized("Based on available market data.")
        }
    }
}
