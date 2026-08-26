import CoreML
import Foundation
import ImageIO
import UIKit
import Vision

actor CoreMLMinifigureDetector: MinifigureDetecting, BulkFrameDetecting, BulkPhotoDetecting {
    static let modelVersion = "coreml-v3-500"
    static let bulkModelVersion = "yolo-v8-seed29-nms-bulk-1024"
    static let minimumConfidence = 0.30
    static let frameEdgeMargin = 0.03

    private static let bulkModelRequiredInputs: Set<String> = [
        "image",
        "iouThreshold",
        "confidenceThreshold"
    ]
    private static let bulkModelRequiredOutputs: Set<String> = [
        "coordinates",
        "confidence"
    ]

    private var visionModel: VNCoreMLModel?
    private var bulkVisionModel: VNCoreMLModel?

    func detect(in frame: CameraFrame) throws -> MinifigureDetectionBatch {
        try detect(in: frame, using: try model(), modelVersion: Self.modelVersion)
    }

    func detectBulk(in frame: CameraFrame) throws -> MinifigureDetectionBatch {
        try detect(in: frame, using: try bulkModel(), modelVersion: Self.bulkModelVersion)
    }

    private func detect(
        in frame: CameraFrame,
        using visionModel: VNCoreMLModel,
        modelVersion: String
    ) throws -> MinifigureDetectionBatch {
        let startedAt = CFAbsoluteTimeGetCurrent()
        let request = VNCoreMLRequest(model: visionModel)
        request.imageCropAndScaleOption = .scaleFit

        let handler = VNImageRequestHandler(
            cvPixelBuffer: frame.pixelBuffer,
            orientation: .up,
            options: [:]
        )
        try handler.perform([request])

        let results = (request.results as? [VNRecognizedObjectObservation] ?? [])
            .filter { Double($0.confidence) >= Self.minimumConfidence }
            .sorted { $0.confidence > $1.confidence }
        let observations = results.enumerated().map { index, result in
            let box = VisionBoundingBoxMapper.topLeftNormalized(result.boundingBox)
            return DetectionObservation(
                confidence: Double(result.confidence),
                boundingBox: box,
                detectionFrameCoverage: box.area,
                fullyVisible: VisionBoundingBoxMapper.isFullyVisible(
                    box,
                    edgeMargin: Self.frameEdgeMargin
                ),
                regionID: "local-\(index + 1)",
                timestamp: frame.timestamp
            )
        }

        return MinifigureDetectionBatch(
            observations: observations,
            inferenceMilliseconds: Int((CFAbsoluteTimeGetCurrent() - startedAt) * 1_000),
            modelVersion: modelVersion
        )
    }

    func detectBulkRegions(in imageData: Data, limit: Int) throws -> BulkPhotoDetectionBatch {
        let startedAt = CFAbsoluteTimeGetCurrent()
        guard let sourceImage = normalizedImage(from: imageData),
              let source = sourceImage.cgImage else {
            throw MinifigureDetectorError.invalidImage
        }

        let sourceWidth = CGFloat(source.width)
        let sourceHeight = CGFloat(source.height)
        let tileRects = Self.bulkTileRects(width: sourceWidth, height: sourceHeight)
        var observations: [DetectionObservation] = []

        for (index, tileRect) in tileRects.enumerated() {
            try Task.checkCancellation()
            let tile = index == 0 ? source : source.cropping(to: tileRect.integral)
            guard let tile else { continue }
            let request = VNCoreMLRequest(model: try bulkModel())
            request.imageCropAndScaleOption = .scaleFit
            let handler = VNImageRequestHandler(cgImage: tile, orientation: .up, options: [:])
            try handler.perform([request])

            let tileWidth = CGFloat(tile.width)
            let tileHeight = CGFloat(tile.height)
            let tileOrigin = index == 0 ? CGPoint.zero : tileRect.origin
            let tileObservations = (request.results as? [VNRecognizedObjectObservation] ?? [])
                .filter { Double($0.confidence) >= 0.22 }
                .compactMap { result -> DetectionObservation? in
                    let local = VisionBoundingBoxMapper.topLeftNormalized(result.boundingBox)
                    let box = NormalizedBoundingBox(
                        x: (tileOrigin.x + local.x * tileWidth) / sourceWidth,
                        y: (tileOrigin.y + local.y * tileHeight) / sourceHeight,
                        width: local.width * tileWidth / sourceWidth,
                        height: local.height * tileHeight / sourceHeight
                    ).clamped
                    guard box.area >= 0.0015 else { return nil }
                    return DetectionObservation(
                        confidence: Double(result.confidence),
                        boundingBox: box,
                        detectionFrameCoverage: box.area,
                        fullyVisible: true,
                        regionID: "library-\(index)-\(UUID().uuidString)",
                        timestamp: .now
                    )
                }
            observations.append(contentsOf: tileObservations)
        }

        let merged = mergeBulkPhotoObservations(observations)
            .enumerated()
            .map { index, observation in
                BulkScanRegion(
                    regionId: "library-\(index + 1)",
                    boundingBox: observation.boundingBox.clamped
                )
            }

        return BulkPhotoDetectionBatch(
            regions: Array(merged),
            inferenceMilliseconds: Int((CFAbsoluteTimeGetCurrent() - startedAt) * 1_000),
            modelVersion: Self.bulkModelVersion,
            tileCount: tileRects.count
        )
    }

    private func model() throws -> VNCoreMLModel {
        if let visionModel { return visionModel }
        guard let modelURL = Bundle(for: ModelBundleToken.self).url(
            forResource: "MinifigureDetector",
            withExtension: "mlmodelc"
        ) else {
            throw MinifigureDetectorError.modelMissing
        }
        let configuration = MLModelConfiguration()
        configuration.computeUnits = .all
        let loaded = try VNCoreMLModel(for: MLModel(contentsOf: modelURL, configuration: configuration))
        visionModel = loaded
        return loaded
    }

    private func bulkModel() throws -> VNCoreMLModel {
        if let bulkVisionModel { return bulkVisionModel }
        guard let modelURL = Bundle(for: ModelBundleToken.self).url(
            forResource: "BulkMinifigureDetector",
            withExtension: "mlmodelc"
        ) else {
            throw MinifigureDetectorError.modelMissing
        }
        let configuration = MLModelConfiguration()
        configuration.computeUnits = .all
        let loadedModel = try MLModel(contentsOf: modelURL, configuration: configuration)
        try Self.validateBulkModelContract(loadedModel)
        let loaded = try VNCoreMLModel(for: loadedModel)
        bulkVisionModel = loaded
        return loaded
    }

    static func bundledBulkModelContract() throws -> (inputs: Set<String>, outputs: Set<String>) {
        guard let modelURL = Bundle(for: ModelBundleToken.self).url(
            forResource: "BulkMinifigureDetector",
            withExtension: "mlmodelc"
        ) else {
            throw MinifigureDetectorError.modelMissing
        }
        let configuration = MLModelConfiguration()
        configuration.computeUnits = .all
        let loadedModel = try MLModel(contentsOf: modelURL, configuration: configuration)
        return (
            Set(loadedModel.modelDescription.inputDescriptionsByName.keys),
            Set(loadedModel.modelDescription.outputDescriptionsByName.keys)
        )
    }

    static func validateBulkModelContract(_ model: MLModel) throws {
        let inputs = Set(model.modelDescription.inputDescriptionsByName.keys)
        let outputs = Set(model.modelDescription.outputDescriptionsByName.keys)
        guard bulkModelRequiredInputs.isSubset(of: inputs),
              bulkModelRequiredOutputs.isSubset(of: outputs) else {
            throw MinifigureDetectorError.incompatibleModel
        }
    }

    private func normalizedImage(from data: Data) -> UIImage? {
        guard let image = UIImage(data: data), image.cgImage != nil else { return nil }
        guard image.imageOrientation != .up else { return image }

        let renderer = UIGraphicsImageRenderer(
            size: image.size,
            format: {
                let format = UIGraphicsImageRendererFormat.preferred()
                format.scale = 1
                format.opaque = true
                return format
            }()
        )
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: image.size))
        }
    }

    static func bulkTileRects(width: CGFloat, height: CGFloat) -> [CGRect] {
        guard width > 0, height > 0 else { return [] }
        var rects = [CGRect(x: 0, y: 0, width: width, height: height)]

        // The detector is strongest when a small figure occupies more of the
        // model input. Run overlapping 3x3, 4x4, and 5x5 passes so dense
        // photos are proposed at several useful scales.
        for gridSize in [3, 4, 5] {
            let columns = gridSize
            let rows = gridSize
            let tileWidth = min(width, width / CGFloat(columns) * 1.55)
            let tileHeight = min(height, height / CGFloat(rows) * 1.55)
            let horizontalStep = (width - tileWidth) / CGFloat(max(columns - 1, 1))
            let verticalStep = (height - tileHeight) / CGFloat(max(rows - 1, 1))

            for row in 0..<rows {
                for column in 0..<columns {
                    let x = min(CGFloat(column) * horizontalStep, width - tileWidth)
                    let y = min(CGFloat(row) * verticalStep, height - tileHeight)
                    rects.append(CGRect(
                        x: max(0, x),
                        y: max(0, y),
                        width: tileWidth,
                        height: tileHeight
                    ))
                }
            }
        }
        return rects
    }

    private func mergeBulkPhotoObservations(_ observations: [DetectionObservation]) -> [DetectionObservation] {
        var kept: [DetectionObservation] = []
        for observation in observations.sorted(by: { $0.confidence > $1.confidence }) {
            let overlapsExisting = kept.contains { existing in
                overlapOfSmaller(existing.boundingBox, observation.boundingBox) >= 0.55
            }
            guard !overlapsExisting else { continue }
            kept.append(observation)
        }

        return kept.sorted {
            if abs($0.boundingBox.y - $1.boundingBox.y) > 0.07 {
                return $0.boundingBox.y < $1.boundingBox.y
            }
            return $0.boundingBox.x < $1.boundingBox.x
        }
    }

    private func overlapOfSmaller(_ lhs: NormalizedBoundingBox, _ rhs: NormalizedBoundingBox) -> Double {
        let right = min(lhs.x + lhs.width, rhs.x + rhs.width)
        let bottom = min(lhs.y + lhs.height, rhs.y + rhs.height)
        let intersection = max(0, right - max(lhs.x, rhs.x)) * max(0, bottom - max(lhs.y, rhs.y))
        let smaller = min(lhs.area, rhs.area)
        return smaller > 0 ? intersection / smaller : 0
    }

}

private final class ModelBundleToken {}

enum MinifigureDetectorError: LocalizedError {
    case modelMissing
    case invalidImage
    case incompatibleModel

    var errorDescription: String? {
        "The on-device minifigure detector is unavailable."
    }
}
