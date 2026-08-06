import CoreVideo
import Testing
@testable import BrickVal

struct CoreMLMinifigureDetectorTests {
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
}
