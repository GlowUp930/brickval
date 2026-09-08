import Foundation
import Testing
@testable import BrickVal

struct ReferralTests {
    @Test
    func decodesReferralStatusFromServerPayload() throws {
        let payload = """
        {
          "code": "ABCD2345",
          "qualifiedCount": 2,
          "goal": 3,
          "bonusBulkScans": 3,
          "bulkCreditsRemaining": 0,
          "rewardGranted": false
        }
        """.data(using: .utf8)!

        let status = try JSONDecoder().decode(ReferralStatus.self, from: payload)

        #expect(status.code == "ABCD2345")
        #expect(status.qualifiedCount == 2)
        #expect(status.goal == 3)
        #expect(status.bulkCreditsRemaining == 0)
    }

    @Test
    @MainActor
    func universalReferralLinkOpensInviteRoute() {
        let suite = "referral-route-test-\(UUID())"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let router = AppRouter(defaults: defaults)
        router.handle(url: URL(string: "https://brickvalue.live/r/ABCD2345")!)

        #expect(router.selectedTab == .settings)
        #expect(router.pendingReferralCode == "ABCD2345")
        #expect(router.settingsPath == [.referral])
    }

    @Test
    @MainActor
    func invalidReferralLinkDoesNotChangeNavigation() {
        let suite = "referral-route-test-\(UUID())"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let router = AppRouter(defaults: defaults)
        router.handle(url: URL(string: "https://brickvalue.live/r/too-short")!)

        #expect(router.selectedTab == .scan)
        #expect(router.pendingReferralCode == nil)
        #expect(router.settingsPath.isEmpty)
    }
}
