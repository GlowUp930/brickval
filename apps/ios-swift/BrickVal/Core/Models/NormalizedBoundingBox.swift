import CoreGraphics
import Foundation

struct NormalizedBoundingBox: Codable, Hashable, Sendable {
    let x: Double
    let y: Double
    let width: Double
    let height: Double

    var area: Double { width * height }
    var center: CGPoint { CGPoint(x: x + width / 2, y: y + height / 2) }

    var clamped: NormalizedBoundingBox {
        let clampedX = min(max(0, x), 1)
        let clampedY = min(max(0, y), 1)
        return NormalizedBoundingBox(
            x: clampedX,
            y: clampedY,
            width: min(max(0, width), 1 - clampedX),
            height: min(max(0, height), 1 - clampedY)
        )
    }
}
