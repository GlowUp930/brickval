import Foundation
import Testing
@testable import BrickVal

@MainActor
struct PostHogAnalyticsTests {
    @Test("a fresh signed-out launch keeps the anonymous identity")
    func freshLaunchDoesNotResetAnonymousIdentity() {
        #expect(
            PostHogAnalytics.shouldResetIdentity(
                identifiedUserID: nil,
                currentDistinctID: "install-anonymous-id",
                anonymousID: "install-anonymous-id"
            ) == false
        )
    }

    @Test("signing out an identified account resets its identity")
    func identifiedAccountResetsOnSignOut() {
        #expect(
            PostHogAnalytics.shouldResetIdentity(
                identifiedUserID: "user_123",
                currentDistinctID: "user_123",
                anonymousID: "install-anonymous-id"
            )
        )
        #expect(
            PostHogAnalytics.shouldResetIdentity(
                identifiedUserID: nil,
                currentDistinctID: "user_123",
                anonymousID: "install-anonymous-id"
            )
        )
    }

    @Test("missing identity values never trigger a reset")
    func missingIdentityValuesStaySafe() {
        #expect(
            PostHogAnalytics.shouldResetIdentity(
                identifiedUserID: nil,
                currentDistinctID: "",
                anonymousID: ""
            ) == false
        )
        #expect(
            PostHogAnalytics.shouldResetIdentity(
                identifiedUserID: nil,
                currentDistinctID: "anonymous",
                anonymousID: ""
            ) == false
        )
    }

    @Test("the analytics install ID persists across analytics instances")
    func installIDPersistsAcrossInstances() {
        let defaults = UserDefaults(suiteName: "PostHogAnalyticsTests.\(UUID().uuidString)")!
        let first = PostHogAnalytics(apiKey: nil, defaults: defaults)
        let second = PostHogAnalytics(apiKey: nil, defaults: defaults)

        #expect(!first.installID.isEmpty)
        #expect(first.installID == second.installID)
    }
}
