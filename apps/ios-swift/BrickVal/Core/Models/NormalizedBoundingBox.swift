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
        NormalizedBoundingBox(
            x: min(max(0, x), 1),
            y: min(max(0, y), 1),
            width: min(max(0, width), 1),
            height: min(max(0, height), 1)
        )
    }
}
