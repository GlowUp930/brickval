import ImageIO
import SwiftUI

actor ImageProcessor {
    func detectionSample(from data: Data, mode: DetectionSampleMode) throws -> Data {
        guard let image = UIImage(data: data) else { throw CameraError.invalidImage }
        let plan = DetectionSamplePlanner.plan(
            width: image.size.width * image.scale,
            height: image.size.height * image.scale,
            mode: mode
        )
        let normalized = normalize(image)
        let cropped = try plan.crop.map { try crop(normalized, to: $0) } ?? normalized
        let resized = resize(cropped, to: plan.outputSize)

        for quality in [0.45, 0.28, 0.16] {
            if let output = resized.jpegData(compressionQuality: quality), output.count <= 100 * 1024 {
                return output
            }
        }
        throw CameraError.sampleTooLarge
    }

    func finalScanImage(from data: Data) throws -> Data {
        guard let image = UIImage(data: data) else { throw CameraError.invalidImage }
        let normalized = normalize(image)
        let pixels = normalized.size.width * normalized.scale * normalized.size.height * normalized.scale
        let shouldResize = pixels > 1_150_000 || data.count > 2_000_000
        let output: UIImage
        if shouldResize {
            let scale = 1024 / max(normalized.size.width, normalized.size.height)
            output = resize(normalized, to: CGSize(
                width: normalized.size.width * scale,
                height: normalized.size.height * scale
            ))
        } else {
            output = normalized
        }
        guard let jpeg = output.jpegData(compressionQuality: 0.72) else { throw CameraError.invalidImage }
        return jpeg
    }

    func previewObservations(
        _ observations: [DetectionObservation],
        sourceData: Data,
        mode: DetectionSampleMode
    ) throws -> [DetectionObservation] {
        guard let image = UIImage(data: sourceData) else { throw CameraError.invalidImage }
        let width = image.size.width * image.scale
        let height = image.size.height * image.scale
        return observations.map { observation in
            DetectionObservation(
                confidence: observation.confidence,
                boundingBox: DetectionSamplePlanner.mapToSource(
                    observation.boundingBox,
                    width: width,
                    height: height,
                    mode: mode
                ),
                detectionFrameCoverage: observation.detectionFrameCoverage,
                fullyVisible: observation.fullyVisible,
                regionID: observation.regionID,
                timestamp: observation.timestamp
            )
        }
    }

    private func normalize(_ image: UIImage) -> UIImage {
        let pixelSize = CGSize(
            width: image.size.width * image.scale,
            height: image.size.height * image.scale
        )
        guard image.imageOrientation != .up || image.scale != 1 else { return image }
        return renderer(size: pixelSize).image { _ in
            image.draw(in: CGRect(origin: .zero, size: pixelSize))
        }
    }

    private func crop(_ image: UIImage, to rect: CGRect) throws -> UIImage {
        guard let cgImage = image.cgImage?.cropping(to: rect) else { throw CameraError.invalidImage }
        return UIImage(cgImage: cgImage)
    }

    private func resize(_ image: UIImage, to size: CGSize) -> UIImage {
        renderer(size: size).image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
    }

    private func renderer(size: CGSize) -> UIGraphicsImageRenderer {
        let format = UIGraphicsImageRendererFormat.preferred()
        format.scale = 1
        format.opaque = true
        return UIGraphicsImageRenderer(size: size, format: format)
    }
}
