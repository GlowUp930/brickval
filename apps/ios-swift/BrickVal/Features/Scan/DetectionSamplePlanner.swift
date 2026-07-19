import CoreGraphics
import Foundation

enum DetectionSamplePlanner {
    static func plan(width: Double, height: Double, mode: DetectionSampleMode) -> DetectionSamplePlan {
        let source = CGSize(width: width, height: height)
        switch mode {
        case .single:
            let side = min(width, height)
            return DetectionSamplePlan(
                crop: CGRect(x: (width - side) / 2, y: (height - side) / 2, width: side, height: side),
                outputSize: CGSize(width: 416, height: 416)
            )
        case .bulk:
            let scale = 416 / max(width, height)
            return DetectionSamplePlan(
                crop: nil,
                outputSize: CGSize(width: source.width * scale, height: source.height * scale)
            )
        }
    }

    static func mapToSource(
        _ box: NormalizedBoundingBox,
        width: Double,
        height: Double,
        mode: DetectionSampleMode
    ) -> NormalizedBoundingBox {
        let plan = plan(width: width, height: height, mode: mode)
        guard let crop = plan.crop, width > 0, height > 0 else { return box.clamped }
        return NormalizedBoundingBox(
            x: (crop.minX + box.x * crop.width) / width,
            y: (crop.minY + box.y * crop.height) / height,
            width: box.width * crop.width / width,
            height: box.height * crop.height / height
        ).clamped
    }
}
