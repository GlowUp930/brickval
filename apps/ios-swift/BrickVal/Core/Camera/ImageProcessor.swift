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

    func finalScanImage(
        from data: Data,
        focusBox: NormalizedBoundingBox? = nil
    ) throws -> Data {
        guard let image = UIImage(data: data) else { throw CameraError.invalidImage }
        let normalized = normalize(image)
        var source = normalized
        var usedFocusCrop = false
        if let focusBox,
           let rect = FocusedScanCropPlanner.cropRect(for: focusBox, imageSize: normalized.size) {
            source = try crop(normalized, to: rect)
            usedFocusCrop = true
        }

        let byteLimit = usedFocusCrop ? 300 * 1024 : 500 * 1024
        let dimensions: [CGFloat] = usedFocusCrop ? [896, 720, 600] : [1024, 896, 720]
        for maximumDimension in dimensions {
            let scale = min(1, maximumDimension / max(source.size.width, source.size.height))
            let output = scale < 1
                ? resize(source, to: CGSize(width: source.size.width * scale, height: source.size.height * scale))
                : source
            for quality in [0.72, 0.58, 0.44, 0.30] {
                if let jpeg = output.jpegData(compressionQuality: quality), jpeg.count <= byteLimit {
                    return jpeg
                }
            }
        }
        throw CameraError.sampleTooLarge
    }

    func bulkRecoveryImage(
        from data: Data,
        focusBox: NormalizedBoundingBox
    ) throws -> Data {
        guard let image = UIImage(data: data) else { throw CameraError.invalidImage }
        let normalized = normalize(image)
        guard let rect = FocusedScanCropPlanner.cropRect(
            for: focusBox,
            imageSize: normalized.size,
            contextRatio: 0
        ) else {
            throw CameraError.invalidImage
        }
        let source = try crop(normalized, to: rect)

        for maximumDimension: CGFloat in [896, 720, 600] {
            let scale = min(1, maximumDimension / max(source.size.width, source.size.height))
            let output = scale < 1
                ? resize(source, to: CGSize(width: source.size.width * scale, height: source.size.height * scale))
                : source
            for quality in [0.72, 0.58, 0.44, 0.30] {
                if let jpeg = output.jpegData(compressionQuality: quality), jpeg.count <= 300 * 1024 {
                    return jpeg
                }
            }
        }
        throw CameraError.sampleTooLarge
    }

    func bulkRegionImage(
        from data: Data,
        region: NormalizedBoundingBox,
        contextRatio: CGFloat = 0.25
    ) throws -> Data {
        guard let image = UIImage(data: data) else { throw CameraError.invalidImage }
        let normalized = normalize(image)
        guard let rect = FocusedScanCropPlanner.cropRect(
            for: region,
            imageSize: normalized.size,
            contextRatio: contextRatio
        ) else {
            throw CameraError.invalidImage
        }
        let source = try crop(normalized, to: rect)

        for maximumDimension: CGFloat in [1280, 1024, 896] {
            let scale = min(1, maximumDimension / max(source.size.width, source.size.height))
            let output: UIImage
            if scale < 1 {
                output = resize(
                    source,
                    to: CGSize(width: source.size.width * scale, height: source.size.height * scale)
                )
            } else {
                output = source
            }
            for quality in [0.80, 0.68, 0.55, 0.42] {
                if let jpeg = output.jpegData(compressionQuality: quality), jpeg.count <= 500 * 1024 {
                    return jpeg
                }
            }
        }
        throw CameraError.sampleTooLarge
    }

    func bulkScanImage(from data: Data) throws -> Data {
        guard let image = UIImage(data: data) else { throw CameraError.invalidImage }
        let normalized = normalize(image)
        for maximumDimension: CGFloat in [1600, 1400, 1200, 1024] {
            let scale = min(1, maximumDimension / max(normalized.size.width, normalized.size.height))
            let output = scale < 1
                ? resize(normalized, to: CGSize(width: normalized.size.width * scale, height: normalized.size.height * scale))
                : normalized
            for quality in [0.76, 0.64, 0.52, 0.40] {
                if let jpeg = output.jpegData(compressionQuality: quality), jpeg.count <= 700 * 1024 {
                    return jpeg
                }
            }
        }
        throw CameraError.sampleTooLarge
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
