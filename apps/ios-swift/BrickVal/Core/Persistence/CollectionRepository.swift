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
        guard FileManager.default.fileExists(atPath: fileURL.path(percentEncoded: false)) else { return [] }
        do {
            return try decoder.decode([CollectionItem].self, from: Data(contentsOf: fileURL))
        } catch {
            let backup = fileURL.appendingPathExtension("backup")
            guard let data = try? Data(contentsOf: backup),
                  let recovered = try? decoder.decode([CollectionItem].self, from: data)
            else { throw error }
            // Preserve the unreadable original before allowing any new write.
            let quarantine = fileURL.appendingPathExtension("unreadable-\(UUID().uuidString)")
            try FileManager.default.copyItem(at: fileURL, to: quarantine)
            try data.write(to: fileURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            return recovered
        }
    }

    func replace(with items: [CollectionItem]) throws {
        let directory = fileURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let data = try encoder.encode(items)
        if FileManager.default.fileExists(atPath: fileURL.path(percentEncoded: false)) {
            let previous = try Data(contentsOf: fileURL)
            _ = try decoder.decode([CollectionItem].self, from: previous)
            try previous.write(to: fileURL.appendingPathExtension("backup"), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        }
        try data.write(to: fileURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        let validated = try decoder.decode([CollectionItem].self, from: Data(contentsOf: fileURL))
        guard validated == items else {
            throw CocoaError(.fileWriteUnknown)
        }
    }

    // Used only for explicit collection/account deletion, including recovery copies.
    func removeAll() throws {
        let directory = fileURL.deletingLastPathComponent()
        guard FileManager.default.fileExists(atPath: directory.path(percentEncoded: false)) else { return }
        for file in try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) {
            if file == fileURL || file.lastPathComponent == fileURL.lastPathComponent + ".backup" ||
                file.lastPathComponent.hasPrefix(fileURL.lastPathComponent + ".unreadable-") {
                try FileManager.default.removeItem(at: file)
            }
        }
    }

    func isEmpty() throws -> Bool { try load().isEmpty }
}
