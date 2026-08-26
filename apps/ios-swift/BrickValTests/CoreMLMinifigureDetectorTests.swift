import CoreML
import CoreVideo
import Testing
@testable import BrickVal

struct CoreMLMinifigureDetectorTests {
    @Test func densePhotoUsesGlobalAndMultiScaleTilePasses() {
        let tiles = CoreMLMinifigureDetector.bulkTileRects(width: 480, height: 640)

        #expect(tiles.count == 51)
        #expect(tiles.first == CGRect(x: 0, y: 0, width: 480, height: 640))
        #expect(tiles.dropFirst().allSatisfy { $0.width < 480 && $0.height < 640 })
    }

    @Test func bundledModelLoadsAndAcceptsExpectedPixelBuffer() async throws {
        var pixelBuffer: CVPixelBuffer?
        let status = CVPixelBufferCreate(
            nil,
            416,
            416,
            kCVPixelFormatType_32BGRA,
            nil,
            &pixelBuffer
        )
        #expect(status == kCVReturnSuccess)
        let buffer = try #require(pixelBuffer)

        CVPixelBufferLockBaseAddress(buffer, [])
        if let baseAddress = CVPixelBufferGetBaseAddress(buffer) {
            memset(baseAddress, 0, CVPixelBufferGetDataSize(buffer))
        }
        CVPixelBufferUnlockBaseAddress(buffer, [])

        let detector = CoreMLMinifigureDetector()
        let result = try await detector.detect(
            in: CameraFrame(pixelBuffer: buffer, timestamp: .now)
        )

        #expect(result.modelVersion == CoreMLMinifigureDetector.modelVersion)
        #expect(result.inferenceMilliseconds >= 0)
    }

    @Test func bundledBulkModelUsesVisionObjectDetectionContract() throws {
        let contract = try CoreMLMinifigureDetector.bundledBulkModelContract()

        #expect(contract.inputs.isSuperset(of: [
            "image",
            "iouThreshold",
            "confidenceThreshold"
        ]))
        #expect(contract.outputs.isSuperset(of: ["coordinates", "confidence"]))
    }

    @Test func bulkModelLoadsForBulkFrames() async throws {
        var pixelBuffer: CVPixelBuffer?
        let status = CVPixelBufferCreate(
            nil,
            416,
            416,
            kCVPixelFormatType_32BGRA,
            nil,
            &pixelBuffer
        )
        #expect(status == kCVReturnSuccess)
        let buffer = try #require(pixelBuffer)

        let detector = CoreMLMinifigureDetector()
        let result = try await detector.detectBulk(
            in: CameraFrame(pixelBuffer: buffer, timestamp: .now)
        )

        #expect(result.modelVersion == CoreMLMinifigureDetector.bulkModelVersion)
        #expect(result.inferenceMilliseconds >= 0)
    }
}
