import Foundation

struct APIConfiguration: Sendable {
    let baseURL: URL
    let hostedSmartScanEnabled: Bool

    static var live: APIConfiguration {
        let rawURL = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String
        guard let baseURL = rawURL.flatMap(URL.init(string:)) ?? URL(string: "https://brickvalue.live") else {
            preconditionFailure("Brickvalue API URL is invalid.")
        }
        let smartScan = (Bundle.main.object(forInfoDictionaryKey: "HostedSmartScanEnabled") as? String) != "NO"
        return APIConfiguration(baseURL: baseURL, hostedSmartScanEnabled: smartScan)
    }
}
