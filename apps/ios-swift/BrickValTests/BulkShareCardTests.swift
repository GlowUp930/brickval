import Foundation
import SwiftUI
import Testing
import UIKit
@testable import BrickVal

struct BulkShareCardTests {
    @Test
    func cropBoxAddsContextAndStaysWithinThePhoto() {
        let cropBox = BulkShareCropper.cropBox(
            for: [
                NormalizedBoundingBox(x: 0.2, y: 0.25, width: 0.2, height: 0.3),
                NormalizedBoundingBox(x: 0.65, y: 0.5, width: 0.2, height: 0.25)
            ],
            context: 0.1
        )

        #expect(cropBox.x == 0.1)
        #expect(cropBox.y == 0.15)
        #expect(abs(cropBox.width - 0.85) < 0.0001)
        #expect(abs(cropBox.height - 0.7) < 0.0001)
        #expect(cropBox.x >= 0)
        #expect(cropBox.y >= 0)
        #expect(cropBox.x + cropBox.width <= 1)
        #expect(cropBox.y + cropBox.height <= 1)
    }

    @Test
    func emptyCropInputUsesTheFullPhoto() {
        #expect(BulkShareCropper.cropBox(for: []) == NormalizedBoundingBox(x: 0, y: 0, width: 1, height: 1))
    }

    @Test @MainActor
    func sharePayloadAggregatesValueAndFindsTheHighestPricedFigure() throws {
        let payload = BulkSharePayload(
            photo: fixtureImage(),
            cropBox: NormalizedBoundingBox(x: 0, y: 0, width: 1, height: 1),
            entries: [
                BulkShareEntry(
                    id: "batman",
                    identifier: "sh0329",
                    name: "Batman",
                    price: 2.55,
                    boundingBox: nil
                ),
                BulkShareEntry(
                    id: "catman",
                    identifier: "coltlbm16",
                    name: "Catman",
                    price: 7.55,
                    boundingBox: nil
                )
            ]
        )

        #expect(abs(payload.total - 10.10) < 0.0001)
        #expect(payload.topFind?.identifier == "coltlbm16")
    }

    @Test @MainActor
    func shareCardRendersToAnImageForSharing() throws {
        let payload = BulkSharePayload(
            photo: fixtureImage(),
            cropBox: NormalizedBoundingBox(x: 0, y: 0, width: 1, height: 1),
            entries: [
                BulkShareEntry(
                    id: "batman",
                    identifier: "sh0329",
                    name: "Batman",
                    price: 2.55,
                    boundingBox: NormalizedBoundingBox(x: 0.2, y: 0.2, width: 0.3, height: 0.5)
                )
            ]
        )
        let renderer = ImageRenderer(
            content: BulkShareCardView(payload: payload)
                .frame(width: 360, height: 640)
        )
        renderer.scale = 3

        let image = try #require(renderer.uiImage)
        #expect(image.size.width > 0)
        #expect(image.size.height > 0)
        #expect(image.jpegData(compressionQuality: 0.9)?.isEmpty == false)
    }

    private func fixtureImage() -> UIImage {
        UIGraphicsImageRenderer(size: CGSize(width: 400, height: 700)).image { context in
            UIColor.systemBlue.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 400, height: 700))
        }
    }
}
