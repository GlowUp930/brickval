import Foundation

struct MinifigureDetectionBatch: Sendable {
    let observations: [DetectionObservation]
    let inferenceMilliseconds: Int
    let modelVersion: String
}

protocol MinifigureDetecting: Sendable {
    func detect(in frame: CameraFrame) async throws -> MinifigureDetectionBatch
}

protocol BulkFrameDetecting: Sendable {
    func detectBulk(in frame: CameraFrame) async throws -> MinifigureDetectionBatch
}

struct BulkPhotoDetectionBatch: Sendable {
    let regions: [BulkScanRegion]
    let inferenceMilliseconds: Int
    let modelVersion: String
    let tileCount: Int
}

protocol BulkPhotoDetecting: Sendable {
    func detectBulkRegions(in imageData: Data, limit: Int) async throws -> BulkPhotoDetectionBatch
}

struct NoopBulkPhotoDetector: BulkPhotoDetecting {
    func detectBulkRegions(in imageData: Data, limit: Int) async throws -> BulkPhotoDetectionBatch {
        BulkPhotoDetectionBatch(regions: [], inferenceMilliseconds: 0, modelVersion: "unavailable", tileCount: 0)
    }
}
