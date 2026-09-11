import CryptoKit
import ImageIO
import UIKit

/// A display-sized, orientation-correct preview for a captured photo.
///
/// Recognition continues to receive the original bytes. This pipeline is only
/// for rendering, so scanner, processing, and results can share one decoded
/// image instead of decoding the same photo during view evaluation.
actor ScanPreviewPipeline {
    static let shared = ScanPreviewPipeline()

    private let memory = NSCache<NSString, UIImage>()
    private var inFlight: [String: Task<UIImage?, Never>] = [:]

    init() {
        memory.totalCostLimit = 24 * 1024 * 1024
        memory.countLimit = 12
    }

    func image(for data: Data, maximumPixelSize: Int = 1600) async -> UIImage? {
        let pixels = max(1, min(maximumPixelSize, 2000))
        let key = cacheKey(for: data, pixels: pixels)
        if let image = memory.object(forKey: key as NSString) {
            return image
        }
        if let task = inFlight[key] {
            return await task.value
        }

        let task = Task.detached(priority: .userInitiated) {
            Self.decode(data: data, maximumPixelSize: pixels)
        }
        inFlight[key] = task
        let image = await task.value
        inFlight[key] = nil
        if let image {
            let cost = image.cgImage.map { $0.bytesPerRow * $0.height } ?? 1
            memory.setObject(image, forKey: key as NSString, cost: cost)
        }
        return image
    }

    func clearMemory() {
        memory.removeAllObjects()
    }

    private func cacheKey(for data: Data, pixels: Int) -> String {
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        return "\(digest)#\(pixels)"
    }

    private nonisolated static func decode(data: Data, maximumPixelSize: Int) -> UIImage? {
        guard let source = CGImageSourceCreateWithData(
            data as CFData,
            [kCGImageSourceShouldCache: false] as CFDictionary
        ),
        let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceThumbnailMaxPixelSize: maximumPixelSize,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceShouldCacheImmediately: true
        ] as CFDictionary) else {
            return nil
        }
        return UIImage(cgImage: image)
    }
}
