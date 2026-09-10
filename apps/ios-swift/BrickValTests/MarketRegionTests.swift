import Foundation
import Testing
@testable import BrickVal

@MainActor
struct MarketRegionTests {
    @Test func countryCodesNormalizeAndRejectInvalidValues() {
        #expect(MarketRegion.sellerCountry(" ca ")?.countryCode == "CA")
        #expect(MarketRegion.sellerCountry("USA") == nil)
        #expect(MarketRegion.sellerCountry("1A") == nil)
        #expect(MarketRegion(rawValue: "all") == .all)
        #expect(MarketRegion(rawValue: "gb")?.countryCode == "GB")
        #expect(MarketRegion.sellerCountry("CA")?.menuTitle(locale: Locale(identifier: "en_CA")) == "Canada (CA)")
    }

    @Test func preferencesRememberCollectionAndItemRegionsSeparately() {
        let defaults = UserDefaults(suiteName: "MarketRegionTests.\(UUID().uuidString)")!
        let first = PreferencesStore(defaults: defaults)
        let item = CollectionItem(setNumber: "75192-1", itemType: .set, name: "Falcon", theme: "Star Wars")
        let used = DetailConditionOption.used.collectionItem(from: item)
        let canada = MarketRegion.sellerCountry("CA")!
        let australia = MarketRegion.sellerCountry("AU")!

        first.collectionMarketRegion = canada
        first.setMarketRegion(australia, for: item)
        #expect(first.marketRegion(for: used) == australia)

        let reloaded = PreferencesStore(defaults: defaults)
        #expect(reloaded.collectionMarketRegion == canada)
        #expect(reloaded.marketRegion(for: item) == australia)
        #expect(reloaded.marketRegion(for: used) == australia)
    }
}
