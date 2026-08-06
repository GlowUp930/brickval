import Foundation

struct MinifigureDetectionBatch: Sendable {
    let observations: [DetectionObservation]
    let inferenceMilliseconds: Int
    let modelVersion: String
}

protocol MinifigureDetecting: Sendable {
    func detect(in frame: CameraFrame) async throws -> MinifigureDetectionBatch
}
