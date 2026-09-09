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
            ),
            BulkScanResultItem(
                id: "demo-existing-2",
                result: result(identifier: "sh0644", name: "Batman", price: 8.25),
                boundingBox: NormalizedBoundingBox(x: 0.58, y: 0.18, width: 0.24, height: 0.30)
            )
        ]
    }

    static var denseItems: [BulkScanResultItem] {
        (0 ..< 60).map { index in
            let column = index % 10
            let row = index / 10
            let box = NormalizedBoundingBox(
                x: 0.025 + Double(column) * 0.095,
                y: 0.055 + Double(row) * 0.145,
                width: 0.065,
                height: 0.095
            )
            return BulkScanResultItem(
                id: "dense-\(index + 1)",
                result: result(
                    identifier: "dense-\(index + 1)",
                    name: "Figure \(index + 1)",
                    price: Double((index % 17) + 2)
                ),
                boundingBox: box
            )
        }
    }

    static var wideProcessingImageData: Data? {
        let size = CGSize(width: 1080, height: 620)
        let image = UIGraphicsImageRenderer(size: size).image { context in
            UIColor(white: 0.12, alpha: 1).setFill()
            context.fill(CGRect(origin: .zero, size: size))

            UIColor.systemYellow.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 34, height: size.height))
            UIColor.systemPink.setFill()
            context.fill(CGRect(x: size.width - 34, y: 0, width: 34, height: size.height))

            UIColor.systemBlue.setFill()
            context.fill(CGRect(x: 34, y: 32, width: size.width - 68, height: size.height - 64))
            UIColor.white.setStroke()
            context.cgContext.setLineWidth(5)
            context.cgContext.stroke(CGRect(x: 34, y: 32, width: size.width - 68, height: size.height - 64))

            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 34),
                .foregroundColor: UIColor.white
            ]
            ("LEFT EDGE").draw(at: CGPoint(x: 58, y: 270), withAttributes: attributes)
            ("RIGHT EDGE").draw(at: CGPoint(x: size.width - 230, y: 270), withAttributes: attributes)
        }
        return image.jpegData(compressionQuality: 0.9)
    }

    static let unresolvedRegions = [
        NormalizedBoundingBox(x: 0.12, y: 0.56, width: 0.22, height: 0.24),
        NormalizedBoundingBox(x: 0.40, y: 0.56, width: 0.22, height: 0.24),
        NormalizedBoundingBox(x: 0.68, y: 0.56, width: 0.20, height: 0.24)
    ]

    static var lockedPreviewRegions: [BulkScanRegion] {
        let resolved = items.compactMap { item -> BulkScanRegion? in
            guard let boundingBox = item.boundingBox else { return nil }
            return BulkScanRegion(regionId: item.id, boundingBox: boundingBox)
        }
        let unresolved = unresolvedRegions.enumerated().map { index, box in
            BulkScanRegion(regionId: "demo-locked-" + String(index + 1), boundingBox: box)
        }
        return resolved + unresolved
    }

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
