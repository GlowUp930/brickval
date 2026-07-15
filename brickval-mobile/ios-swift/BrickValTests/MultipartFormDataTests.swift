import Foundation
import Testing
@testable import BrickVal

struct MultipartFormDataTests {
    @Test func writesFieldsAndFilesWithClosingBoundary() {
        var form = MultipartFormData(boundary: "test-boundary")
        form.append(name: "mode", value: "minifig")
        form.append(name: "image", filename: "scan.jpg", contentType: "image/jpeg", fileData: Data([1, 2, 3]))
        form.finalize()
        let text = String(decoding: form.data, as: UTF8.self)
        #expect(text.contains("name=\"mode\""))
        #expect(text.contains("filename=\"scan.jpg\""))
        #expect(text.hasSuffix("--test-boundary--\r\n"))
    }
}
