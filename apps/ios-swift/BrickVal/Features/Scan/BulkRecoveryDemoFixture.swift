#if DEBUG
import UIKit

enum BulkRecoveryDemoFixture {
    static var imageData: Data? {
        UIImage(named: "AvatarClassic")?.jpegData(compressionQuality: 0.9)
    }

    static var items: [BulkScanResultItem] {
        [
            BulkScanResultItem(
                id: "demo-existing",
                result: result(identifier: "sh0115", name: "Spider-Man", price: 5.14),
                boundingBox: NormalizedBoundingBox(x: 0.30, y: 0.18, width: 0.24, height: 0.30)
            )
        ]
    }

    static let unresolvedRegions = [
        NormalizedBoundingBox(x: 0.12, y: 0.56, width: 0.22, height: 0.24),
        NormalizedBoundingBox(x: 0.40, y: 0.56, width: 0.22, height: 0.24),
        NormalizedBoundingBox(x: 0.68, y: 0.56, width: 0.20, height: 0.24)
    ]

    private static func result(identifier: String, name: String, price: Double) -> LookupResult {
        LookupResult(
            identifier: identifier,
            itemType: .minifig,
            name: name,
            theme: "Minifigure",
            pieces: nil,
            yearReleased: nil,
            isObsolete: nil,
            imageURL: nil,
            pricing: LookupPricing(
                heroNewAverageUSD: nil,
                rrpUSD: nil,
                gainPercent: nil,
                dataSource: "fixture",
                newSoldAverageUSD: nil,
                usedSoldAverageUSD: price,
                newStockAverageUSD: nil,
                usedStockAverageUSD: nil,
                brickLinkNewAverageUSD: nil,
                brickLinkUsedAverageUSD: nil
            ),
            marketHistory: [],
            colorID: nil,
            colorName: nil
        )
    }
}
#endif
