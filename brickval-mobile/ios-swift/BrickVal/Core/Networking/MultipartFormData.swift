import Foundation

struct MultipartFormData: Sendable {
    let boundary: String
    private(set) var data = Data()

    init(boundary: String = "brickval-\(UUID().uuidString)") {
        self.boundary = boundary
    }

    var contentType: String { "multipart/form-data; boundary=\(boundary)" }

    mutating func append(name: String, value: String) {
        appendBoundary()
        data.append(Data("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".utf8))
        data.append(Data(value.utf8))
        data.append(Data("\r\n".utf8))
    }

    mutating func append(name: String, filename: String, contentType: String, fileData: Data) {
        appendBoundary()
        data.append(Data("Content-Disposition: form-data; name=\"\(name)\"; filename=\"\(filename)\"\r\n".utf8))
        data.append(Data("Content-Type: \(contentType)\r\n\r\n".utf8))
        data.append(fileData)
        data.append(Data("\r\n".utf8))
    }

    mutating func finalize() {
        data.append(Data("--\(boundary)--\r\n".utf8))
    }

    private mutating func appendBoundary() {
        data.append(Data("--\(boundary)\r\n".utf8))
    }
}
