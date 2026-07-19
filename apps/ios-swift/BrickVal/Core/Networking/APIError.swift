import Foundation

struct APIError: LocalizedError, Sendable {
    let endpoint: String
    let statusCode: Int
    let serverMessage: String?

    var errorDescription: String? {
        serverMessage ?? "\(endpoint) failed with status \(statusCode)."
    }
}
