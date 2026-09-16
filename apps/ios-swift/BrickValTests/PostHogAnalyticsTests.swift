import Foundation
import Testing
@testable import BrickVal

@MainActor
struct PostHogAnalyticsTests {
    @Test("interaction event names and schema stay stable")
    func interactionEventContractStaysStable() {
        #expect(PostHogAnalytics.schemaVersion == 4)
        #expect(PostHogEvent.tabSelected == "tab_selected")
        #expect(PostHogEvent.scanShutterTapped == "scan_shutter_tapped")
        #expect(PostHogEvent.scanTryAgainTapped == "scan_try_again_tapped")
        #expect(PostHogEvent.scanErrorShown == "scan_error_shown")
        #expect(PostHogEvent.collectionItemOpened == "collection_item_opened")
        #expect(PostHogEvent.timeframeChanged == "timeframe_changed")
        #expect(PostHogEvent.bulkResultSelectionChanged == "bulk_result_selection_changed")
    }

    @Test("scan recovery events have separate start, failure, and retry names")
    func scanRecoveryEventsRemainDistinct() {
        #expect(PostHogEvent.scanStarted != PostHogEvent.scanFailed)
        #expect(PostHogEvent.scanFailed != PostHogEvent.scanTryAgainTapped)
        #expect(PostHogEvent.scanErrorShown != PostHogEvent.scanFailed)
    }

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
