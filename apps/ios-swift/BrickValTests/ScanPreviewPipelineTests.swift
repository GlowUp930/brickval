import UIKit
import Testing
@testable import BrickVal

@MainActor
struct ScanPreviewPipelineTests {
    @Test func sharedPreviewIsDownsampledAndInvalidDataDoesNotReachViews() async throws {
        let data = UIGraphicsImageRenderer(size: CGSize(width: 2400, height: 1200)).jpegData(
            withCompressionQuality: 0.9
        ) { context in
            UIColor.systemGreen.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 2400, height: 1200))
        }

        async let first = ScanPreviewPipeline.shared.image(for: data, maximumPixelSize: 600)
        async let second = ScanPreviewPipeline.shared.image(for: data, maximumPixelSize: 600)
        let (one, two) = await (first, second)

        #expect(one?.cgImage?.width == 600)
        #expect(two?.cgImage?.width == 600)
        #expect(await ScanPreviewPipeline.shared.image(for: Data("not an image".utf8)) == nil)
    }
}
