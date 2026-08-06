import Foundation

struct APIConfiguration: Sendable {
    let baseURL: URL

    static var live: APIConfiguration {
        let rawURL = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String
        guard let baseURL = rawURL.flatMap(URL.init(string:)) ?? URL(string: "https://brickvalue.live") else {
            preconditionFailure("Brickvalue API URL is invalid.")
        }
        return APIConfiguration(baseURL: baseURL)
    }
}
