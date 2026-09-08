import CoreGraphics
import Testing
import UIKit
@testable import BrickVal

struct BulkImageGeometryTests {
    @Test
    func aspectFitKeepsTheWholeLandscapePhotoInsideTheScannerStage() {
        let rect = BulkImageLayout.aspectFitRect(
            imageSize: CGSize(width: 1080, height: 620),
            containerSize: CGSize(width: 360, height: 480)
        )

        #expect(abs(rect.width - 360) < 0.001)
        #expect(abs(rect.height - (620.0 / 1080.0 * 360.0)) < 0.001)
        #expect(rect.minX == 0)
        #expect(rect.minY > 0)
        #expect(rect.maxX == 360)
        #expect(rect.maxY < 480)
    }

    @Test
    func aspectFitKeepsPortraitAndPanoramicRatiosWithoutStretching() {
        let cases = [
            CGSize(width: 620, height: 1080),
            CGSize(width: 2400, height: 400),
            CGSize(width: 800, height: 800)
        ]
        let container = CGSize(width: 360, height: 480)

        for imageSize in cases {
            let rect = BulkImageLayout.aspectFitRect(
                imageSize: imageSize,
                containerSize: container
            )

            #expect(abs(rect.width / rect.height - imageSize.width / imageSize.height) < 0.0001)
            #expect(rect.minX >= 0)
            #expect(rect.minY >= 0)
            #expect(rect.maxX <= container.width)
            #expect(rect.maxY <= container.height)
        }
    }

    @Test
    func squareCanvasMapsLandscapeBoxesBackToOriginalCoordinates() throws {
        let source = try #require(fixtureImage(width: 1080, height: 620).cgImage)
        let canvas = try #require(BulkSquareInferenceCanvas(source: source))
        let sourceBox = NormalizedBoundingBox(x: 0.25, y: 0.20, width: 0.20, height: 0.40)
        let squareBox = NormalizedBoundingBox(
            x: canvas.normalizedContentRect.minX + sourceBox.x * canvas.normalizedContentRect.width,
            y: canvas.normalizedContentRect.minY + sourceBox.y * canvas.normalizedContentRect.height,
            width: sourceBox.width * canvas.normalizedContentRect.width,
            height: sourceBox.height * canvas.normalizedContentRect.height
        )

        let mapped = try #require(canvas.mapToSource(squareBox))

        #expect(abs(mapped.x - sourceBox.x) < 0.0001)
        #expect(abs(mapped.y - sourceBox.y) < 0.0001)
        #expect(abs(mapped.width - sourceBox.width) < 0.0001)
        #expect(abs(mapped.height - sourceBox.height) < 0.0001)
    }

    @Test
    func squareCanvasDropsPaddingOnlyDetectionsAndClipsPartialBoxes() throws {
        let source = try #require(fixtureImage(width: 1080, height: 620).cgImage)
        let canvas = try #require(BulkSquareInferenceCanvas(source: source))

        #expect(canvas.mapToSource(NormalizedBoundingBox(x: 0.1, y: 0.02, width: 0.2, height: 0.08)) == nil)

        let partial = try #require(canvas.mapToSource(
            NormalizedBoundingBox(x: 0.30, y: 0.18, width: 0.16, height: 0.20)
        ))
        #expect(partial.x >= 0)
        #expect(partial.y == 0)
        #expect(partial.x + partial.width <= 1)
        #expect(partial.y + partial.height <= 1)
        #expect(partial.height < 1)
    }

    @Test
    func squareCanvasPreservesPortraitAndSquareContentRectangles() throws {
        let portraitImage = try #require(fixtureImage(width: 620, height: 1080).cgImage)
        let squareImage = try #require(fixtureImage(width: 800, height: 800).cgImage)
        let portrait = try #require(BulkSquareInferenceCanvas(source: portraitImage))
        let square = try #require(BulkSquareInferenceCanvas(source: squareImage))

        #expect(portrait.normalizedContentRect.minX > 0)
        #expect(portrait.normalizedContentRect.minY == 0)
        #expect(square.normalizedContentRect == CGRect(x: 0, y: 0, width: 1, height: 1))
    }

    @Test
    func mergeKeepsSeparateFiguresAndRemovesDuplicateProposals() {
        let observations = [
            DetectionObservation(
                confidence: 0.92,
                boundingBox: NormalizedBoundingBox(x: 0.10, y: 0.18, width: 0.18, height: 0.40),
                fullyVisible: true,
                regionID: "source-a"
            ),
            DetectionObservation(
                confidence: 0.82,
                boundingBox: NormalizedBoundingBox(x: 0.105, y: 0.185, width: 0.18, height: 0.40),
                fullyVisible: true,
                regionID: "square-a"
            ),
            DetectionObservation(
                confidence: 0.88,
                boundingBox: NormalizedBoundingBox(x: 0.56, y: 0.19, width: 0.18, height: 0.40),
                fullyVisible: true,
                regionID: "square-b"
            )
        ]

        let merged = CoreMLMinifigureDetector.mergeBulkPhotoObservations(observations)

        #expect(merged.count == 2)
        #expect(merged.first?.boundingBox.x == 0.10)
        #expect(merged.last?.boundingBox.x == 0.56)
    }

    @Test
    func recognitionAndRecoveryCropsArePaddedSquaresWithinByteLimits() async throws {
        let source = fixtureImage(width: 1080, height: 620)
        let data = try #require(source.jpegData(compressionQuality: 0.9))
        let processor = ImageProcessor()
        let region = NormalizedBoundingBox(x: 0.25, y: 0.18, width: 0.18, height: 0.52)

        let recognition = try await processor.bulkRegionImage(from: data, region: region)
        let recovery = try await processor.bulkRecoveryImage(from: data, focusBox: region)
        let recognitionImage = try #require(UIImage(data: recognition)?.cgImage)
        let recoveryImage = try #require(UIImage(data: recovery)?.cgImage)

        #expect(recognitionImage.width == recognitionImage.height)
        #expect(recoveryImage.width == recoveryImage.height)
        #expect(recognition.count <= 500 * 1024)
        #expect(recovery.count <= 300 * 1024)
    }

    @Test
    func rotatedInputStillProducesSquareRecognitionCrop() async throws {
        let base = fixtureImage(width: 620, height: 1080)
        let rotated = UIImage(cgImage: try #require(base.cgImage), scale: 1, orientation: .left)
        let data = try #require(rotated.jpegData(compressionQuality: 0.9))
        let processor = ImageProcessor()

        let output = try await processor.bulkRegionImage(
            from: data,
            region: NormalizedBoundingBox(x: 0.2, y: 0.2, width: 0.30, height: 0.35),
            contextRatio: 0
        )
        let image = try #require(UIImage(data: output)?.cgImage)

        #expect(image.width == image.height)
        #expect(output.count <= 500 * 1024)
    }

    private func fixtureImage(width: Int, height: Int) -> UIImage {
        UIGraphicsImageRenderer(size: CGSize(width: width, height: height)).image { context in
            UIColor.systemBlue.setFill()
            context.fill(CGRect(x: 0, y: 0, width: width, height: height))
            UIColor.systemYellow.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 8, height: height))
            UIColor.systemRed.setFill()
            context.fill(CGRect(x: width - 8, y: 0, width: 8, height: height))
        }
    }
}
