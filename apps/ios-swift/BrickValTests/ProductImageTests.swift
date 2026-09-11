import UIKit
import Testing
@testable import BrickVal

@MainActor
struct ProductImageTests {
    @Test func sharedDownloadDownsamplingOfflineRestartAndMemoryEviction() async throws {
        let data = UIGraphicsImageRenderer(size: CGSize(width: 1000, height: 600)).pngData { context in
            UIColor.green.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 1000, height: 600))
        }
        let counter = ImageRequests()
        let directory = URL.temporaryDirectory.appending(path: "image-test-\(UUID().uuidString)")
        let pipeline = ProductImagePipeline(directory: directory) { _ in
            await counter.increment()
            try await Task.sleep(for: .milliseconds(30))
            return data
        }
        let url = URL(string: "https://example.invalid/product.png")!
        async let small = pipeline.image(for: url, pixels: 100)
        async let large = pipeline.image(for: url, pixels: 500)
        let (thumbnail, hero) = try await (small, large)
        #expect(thumbnail.cgImage?.width == 100)
        #expect(hero.cgImage?.width == 500)
        #expect(await counter.count == 1)
        await pipeline.clearMemory()
        #expect(await pipeline.cachedImage(for: url, pixels: 100) == nil)
        _ = try await pipeline.image(for: url, pixels: 100)
        #expect(await counter.count == 1)
        let offline = ProductImagePipeline(directory: directory) { _ in throw URLError(.notConnectedToInternet) }
        #expect(try await offline.image(for: url, pixels: 200).cgImage?.width == 200)
    }

    @Test func failedDownloadsCanRetryAndDiskCacheIsBounded() async throws {
        let data = UIGraphicsImageRenderer(size: CGSize(width: 30, height: 30)).pngData { context in
            UIColor.blue.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 30, height: 30))
        }
        let counter = ImageRequests()
        let directory = URL.temporaryDirectory.appending(path: "image-limit-\(UUID().uuidString)")
        let pipeline = ProductImagePipeline(directory: directory, diskLimit: 1) { _ in
            let attempt = await counter.increment()
            if attempt == 1 { throw URLError(.notConnectedToInternet) }
            return data
        }
        let url = URL(string: "https://example.invalid/retry.png")!
        do { _ = try await pipeline.image(for: url, pixels: 30); Issue.record("Expected offline failure") } catch {}
        _ = try await pipeline.image(for: url, pixels: 30)
        #expect(await counter.count == 2)
        for _ in 0..<20 {
            if try FileManager.default.contentsOfDirectory(atPath: directory.path).isEmpty { break }
            try await Task.sleep(for: .milliseconds(10))
        }
        #expect(try FileManager.default.contentsOfDirectory(atPath: directory.path).isEmpty)
    }
}

private actor ImageRequests {
    var count = 0
    @discardableResult func increment() -> Int { count += 1; return count }
}
