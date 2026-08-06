import CoreGraphics

enum FocusedScanCropPlanner {
    static func cropRect(
        for box: NormalizedBoundingBox,
        imageSize: CGSize,
        contextRatio: Double = 0.30
    ) -> CGRect? {
        guard box.width > 0, box.height > 0, imageSize.width > 0, imageSize.height > 0 else {
            return nil
        }
        let horizontalContext = box.width * contextRatio
        let verticalContext = box.height * contextRatio
        let left = max(0, box.x - horizontalContext)
        let top = max(0, box.y - verticalContext)
        let right = min(1, box.x + box.width + horizontalContext)
        let bottom = min(1, box.y + box.height + verticalContext)
        guard right > left, bottom > top else { return nil }
        return CGRect(
            x: left * imageSize.width,
            y: top * imageSize.height,
            width: (right - left) * imageSize.width,
            height: (bottom - top) * imageSize.height
        ).integral
    }
}
