import Foundation
import Testing
@testable import BrickVal

@MainActor
struct SentryConfigurationTests {
    @Test func automaticFailedRequestCaptureIsLimitedToTheBrickValAPIHost() {
        let apiURL = URL(string: "https://brickvalue.live/api/lookup")!

        #expect(AppSDKCoordinator.sentryFailedRequestTargets(for: apiURL) == ["brickvalue.live"])
    }
}
