import Foundation

enum AppLinks {
    static let privacy = requiredURL("https://brickvalue.live/privacy")
    static let terms = requiredURL("https://brickvalue.live/terms")
    static let appStore = requiredURL("https://apps.apple.com/au/app/brickvalue/id6771715475")
    static let detectorAttribution = requiredURL(
        "https://universe.roboflow.com/vc-echpj/lego-minifigures-r3zzt"
    )

    private static func requiredURL(_ value: String) -> URL {
        guard let url = URL(string: value) else {
            preconditionFailure("Invalid bundled URL: \(value)")
        }
        return url
    }
}
