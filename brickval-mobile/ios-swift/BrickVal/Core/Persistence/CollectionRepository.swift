import Foundation

actor CollectionRepository {
    private let fileURL: URL
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    init(fileURL: URL? = nil) {
        self.fileURL = fileURL ?? URL.applicationSupportDirectory
            .appending(path: "BrickVal", directoryHint: .isDirectory)
            .appending(path: "collection.json")
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    }

    func load() throws -> [CollectionItem] {
        guard FileManager.default.fileExists(atPath: fileURL.path()) else { return [] }
        return try decoder.decode([CollectionItem].self, from: Data(contentsOf: fileURL))
    }

    func replace(with items: [CollectionItem]) throws {
        let directory = fileURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let data = try encoder.encode(items)
        try data.write(to: fileURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        let validated = try decoder.decode([CollectionItem].self, from: Data(contentsOf: fileURL))
        guard validated == items else {
            throw CocoaError(.fileWriteUnknown)
        }
    }

    func isEmpty() throws -> Bool { try load().isEmpty }
}
