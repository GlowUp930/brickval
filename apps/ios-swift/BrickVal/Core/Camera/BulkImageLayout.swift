import CoreGraphics
import UIKit

enum BulkImageLayout {
    static func aspectFitRect(imageSize: CGSize, containerSize: CGSize) -> CGRect {
        guard imageSize.width > 0,
              imageSize.height > 0,
              containerSize.width > 0,
              containerSize.height > 0
        else {
            return CGRect(origin: .zero, size: containerSize)
        }

        let scale = min(
            containerSize.width / imageSize.width,
            containerSize.height / imageSize.height
        )
        let renderedSize = CGSize(
            width: imageSize.width * scale,
            height: imageSize.height * scale
        )
        return CGRect(
            x: (containerSize.width - renderedSize.width) / 2,
            y: (containerSize.height - renderedSize.height) / 2,
            width: renderedSize.width,
            height: renderedSize.height
        )
    }
}

/// A square, padded representation used only for the bulk photo detector.
/// The original content rectangle makes it possible to map model boxes back
/// to the upright source photo without treating padding as a detected figure.
/// The captured photo is never replaced by this detector-only representation.
struct BulkSquareInferenceCanvas {
    let image: CGImage
    let contentRect: CGRect
    let normalizedContentRect: CGRect

    init?(source: CGImage) {
        let sourceWidth = CGFloat(source.width)
        let sourceHeight = CGFloat(source.height)
        guard sourceWidth > 0, sourceHeight > 0 else { return nil }

        let side = max(sourceWidth, sourceHeight)
        let contentRect = CGRect(
            x: (side - sourceWidth) / 2,
            y: (side - sourceHeight) / 2,
            width: sourceWidth,
            height: sourceHeight
        )
        let sourceImage = UIImage(cgImage: source, scale: 1, orientation: .up)
        let format = UIGraphicsImageRendererFormat.preferred()
        format.scale = 1
        format.opaque = true
        let rendered = UIGraphicsImageRenderer(
            size: CGSize(width: side, height: side),
            format: format
        ).image { context in
            UIColor.black.setFill()
            context.fill(CGRect(x: 0, y: 0, width: side, height: side))
            sourceImage.draw(in: contentRect)
        }

        // Re-encode the detector canvas into a standard image representation so
        // both inference passes receive the same color and pixel layout.
        guard let imageData = rendered.jpegData(compressionQuality: 1),
              let image = UIImage(data: imageData)?.cgImage
        else {
            return nil
        }
        self.image = image
        self.contentRect = contentRect
        self.normalizedContentRect = CGRect(
            x: contentRect.minX / side,
            y: contentRect.minY / side,
            width: contentRect.width / side,
            height: contentRect.height / side
        )
    }

    func mapToSource(_ box: NormalizedBoundingBox) -> NormalizedBoundingBox? {
        let normalizedBox = box.clamped
        let candidate = CGRect(
            x: normalizedBox.x,
            y: normalizedBox.y,
            width: normalizedBox.width,
            height: normalizedBox.height
        )
        let clipped = candidate.intersection(normalizedContentRect)
        guard !clipped.isNull,
              clipped.width > 0,
              clipped.height > 0,
              normalizedContentRect.width > 0,
              normalizedContentRect.height > 0
        else {
            return nil
        }

        return NormalizedBoundingBox(
            x: (clipped.minX - normalizedContentRect.minX) / normalizedContentRect.width,
            y: (clipped.minY - normalizedContentRect.minY) / normalizedContentRect.height,
            width: clipped.width / normalizedContentRect.width,
            height: clipped.height / normalizedContentRect.height
        ).clamped
    }
}
