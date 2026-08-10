import Foundation

struct APIError: LocalizedError, Sendable {
    let endpoint: String
    let statusCode: Int
    let serverMessage: String?
    let feature: ProFeature?
    let usage: UsageSnapshot?

    init(
        endpoint: String,
        statusCode: Int,
        serverMessage: String?,
        feature: ProFeature? = nil,
        usage: UsageSnapshot? = nil
    ) {
        self.endpoint = endpoint
        self.statusCode = statusCode
        self.serverMessage = serverMessage
        self.feature = feature
        self.usage = usage
    }

    var isProLimit: Bool { statusCode == 402 && feature != nil }

    var errorDescription: String? {
        serverMessage ?? "\(endpoint) failed with status \(statusCode)."
    }
}
