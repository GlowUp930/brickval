import CryptoKit
import Dispatch
import ImageIO
import SwiftUI

/// Public product photos only. Disk and decoded-image work stays on this actor.
actor ProductImagePipeline {
    static let shared = ProductImagePipeline()
    private let memory = NSCache<NSString, UIImage>()
    private var downloads: [URL: Task<Data, Error>] = [:]
    private let directory: URL
    private let diskLimit: Int
    private let fetch: @Sendable (URL) async throws -> Data
    private var lastDiskTrimAt = Date.distantPast
    private let decodeLimiter = DispatchSemaphore(value: 2)

    init(directory: URL = URL.cachesDirectory.appending(path: "BrickValProductImages"), diskLimit: Int = 100 * 1024 * 1024,
         fetch: @escaping @Sendable (URL) async throws -> Data = { url in
             let (data, response) = try await URLSession.shared.data(from: url)
             guard let response = response as? HTTPURLResponse, (200..<300).contains(response.statusCode), data.count <= 10 * 1024 * 1024 else {
                 throw URLError(.badServerResponse)
             }
             return data
         }) {
        self.directory = directory
        self.diskLimit = diskLimit
        self.fetch = fetch
        memory.totalCostLimit = 32 * 1024 * 1024
        memory.countLimit = 120
    }

    func cachedImage(for url: URL, pixels: Int) -> UIImage? {
        let boundedPixels = max(1, min(pixels, 1600))
        return memory.object(forKey: "\(url.absoluteString)#\(boundedPixels)" as NSString)
    }

    func image(for url: URL, pixels: Int) async throws -> UIImage {
        let pixels = max(1, min(pixels, 1600))
        let key = "\(url.absoluteString)#\(pixels)" as NSString
        if let image = memory.object(forKey: key) { return image }
        let data = try await data(for: url)
        // Another consumer may have decoded this size while the download was in flight.
        if let image = memory.object(forKey: key) { return image }
        let limiter = decodeLimiter
        let decodeTask: Task<UIImage?, Never> = Task.detached(priority: .userInitiated) {
            Self.decode(data: data, pixels: pixels, limiter: limiter)
        }
        guard let image = await decodeTask.value else {
            try? FileManager.default.removeItem(at: cacheFile(for: url))
            throw URLError(.cannotDecodeContentData)
        }
        let cost = image.cgImage.map { $0.bytesPerRow * $0.height } ?? 1
        memory.setObject(image, forKey: key, cost: cost)
        return image
    }

    private nonisolated static func decode(data: Data, pixels: Int, limiter: DispatchSemaphore) -> UIImage? {
        limiter.wait()
        defer { limiter.signal() }
        guard let source = CGImageSourceCreateWithData(data as CFData, [kCGImageSourceShouldCache: false] as CFDictionary),
              let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceThumbnailMaxPixelSize: pixels,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceShouldCacheImmediately: true
              ] as CFDictionary) else {
            return nil
        }
        return UIImage(cgImage: cgImage)
    }

    func clearMemory() { memory.removeAllObjects() }

    private func data(for url: URL) async throws -> Data {
        let file = cacheFile(for: url)
        if let data = try? Data(contentsOf: file), data.count <= 10 * 1024 * 1024,
           CGImageSourceCreateWithData(data as CFData, nil) != nil {
            try? FileManager.default.setAttributes([.modificationDate: Date.now], ofItemAtPath: file.path)
            return data
        }
        if let task = downloads[url] { return try await task.value }
        let task = Task { try await fetch(url) }
        downloads[url] = task
        defer { downloads[url] = nil }
        let data = try await task.value
        guard data.count <= 10 * 1024 * 1024, CGImageSourceCreateWithData(data as CFData, nil) != nil else {
            throw URLError(.cannotDecodeContentData)
        }
        // Cache failure must not prevent displaying a successfully downloaded image.
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try? data.write(to: file, options: .atomic)
        scheduleDiskTrimIfNeeded()
        return data
    }

    private func cacheFile(for url: URL) -> URL {
        let name = SHA256.hash(data: Data(url.absoluteString.utf8)).map { String(format: "%02x", $0) }.joined()
        return directory.appending(path: name)
    }

    private func scheduleDiskTrimIfNeeded() {
        guard Date.now.timeIntervalSince(lastDiskTrimAt) >= 30 else { return }
        lastDiskTrimAt = .now
        let directory = self.directory
        let diskLimit = self.diskLimit
        Task.detached(priority: .utility) {
            Self.trimDisk(directory: directory, diskLimit: diskLimit)
        }
    }

    private nonisolated static func trimDisk(directory: URL, diskLimit: Int) {
        let keys: Set<URLResourceKey> = [.contentModificationDateKey, .fileSizeKey, .isRegularFileKey]
        guard let files = try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: Array(keys)) else { return }
        let entries = files.compactMap { url -> (URL, Date, Int)? in
            guard let values = try? url.resourceValues(forKeys: keys), values.isRegularFile == true else { return nil }
            return (url, values.contentModificationDate ?? .distantPast, values.fileSize ?? 0)
        }.sorted { $0.1 < $1.1 }
        var size = entries.reduce(0) { $0 + $1.2 }
        for (url, _, bytes) in entries where size > diskLimit {
            if (try? FileManager.default.removeItem(at: url)) != nil { size -= bytes }
        }
    }
}

struct ProductImage: View {
    @Environment(\.displayScale) private var displayScale
    let url: URL?
    let pointSize: CGFloat
    var contentMode: ContentMode = .fit
    @State private var image: UIImage?
    @State private var failed = false
    @State private var retry = 0

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image).resizable().aspectRatio(contentMode: contentMode)
            } else if failed {
                Button { retry += 1 } label: {
                    Image(systemName: "arrow.clockwise").font(.title2).frame(minWidth: 44, minHeight: 44)
                }
                .accessibilityLabel("Retry")
            } else if url == nil {
                Image(systemName: "shippingbox").font(.title)
            } else {
                SkeletonPlaceholder(cornerRadius: 8, fill: BrickValStyle.Primitive.gray200, highlight: BrickValStyle.Primitive.white)
                    .frame(width: 72, height: 72)
            }
        }
        .task(id: Request(url: url, pixels: Int(pointSize * displayScale), retry: retry)) {
            image = nil
            failed = false
            guard let url else { return }
            let cached = await ProductImagePipeline.shared.cachedImage(
                for: url,
                pixels: Int(pointSize * displayScale)
            )
            guard !Task.isCancelled else { return }
            image = cached
            do {
                let loaded = try await ProductImagePipeline.shared.image(for: url, pixels: Int(pointSize * displayScale))
                guard !Task.isCancelled else { return }
                image = loaded
            } catch {
                guard !Task.isCancelled else { return }
                failed = true
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didReceiveMemoryWarningNotification)) { _ in
            Task { await ProductImagePipeline.shared.clearMemory() }
        }
    }

    private struct Request: Equatable {
        let url: URL?
        let pixels: Int
        let retry: Int
    }
}
