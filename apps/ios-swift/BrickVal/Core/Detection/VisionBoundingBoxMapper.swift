import CoreGraphics
import Foundation

enum VisionBoundingBoxMapper {
    static func topLeftNormalized(_ visionBox: CGRect) -> NormalizedBoundingBox {
        NormalizedBoundingBox(
            x: visionBox.origin.x,
            y: 1 - visionBox.origin.y - visionBox.height,
            width: visionBox.width,
            height: visionBox.height
        ).clamped
    }

    static func isFullyVisible(
        _ box: NormalizedBoundingBox,
        edgeMargin: Double
    ) -> Bool {
        box.x >= edgeMargin &&
            box.y >= edgeMargin &&
            box.x + box.width <= 1 - edgeMargin &&
            box.y + box.height <= 1 - edgeMargin
    }
}
