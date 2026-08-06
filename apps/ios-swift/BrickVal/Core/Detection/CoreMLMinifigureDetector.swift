import CoreML
import Foundation
import ImageIO
import Vision

actor CoreMLMinifigureDetector: MinifigureDetecting {
    static let modelVersion = "coreml-v3-500"
    static let minimumConfidence = 0.30
    static let frameEdgeMargin = 0.03

    private var visionModel: VNCoreMLModel?

    func detect(in frame: CameraFrame) throws -> MinifigureDetectionBatch {
        let startedAt = CFAbsoluteTimeGetCurrent()
        let request = VNCoreMLRequest(model: try model())
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
            modelVersion: Self.modelVersion
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

}

private final class ModelBundleToken {}

enum MinifigureDetectorError: LocalizedError {
    case modelMissing

    var errorDescription: String? {
        "The on-device minifigure detector is unavailable."
    }
}
