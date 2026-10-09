import Foundation
import Testing
@testable import BrickVal

struct RetentionNotificationTests {
    private let zone = TimeZone(secondsFromGMT: 0)!
    private let start = ISO8601DateFormatter().date(from: "2026-10-09T10:00:00Z")!
    private func activeState() -> RetentionNotificationState {
        var state = RetentionNotificationState()
        state.assignment = .sequence; state.consent = true
        state.campaignVersion = 2; state.consentAt = start
        return state
    }
    private func plan(_ state: RetentionNotificationState, utilities: [Date] = []) -> [RetentionNotificationState.Reservation] {
        RetentionNotificationPlanner.reservations(state: state, now: start, timeZone: zone, utilityDates: utilities)
    }
    @Test("all first-week dates are reserved even without a scan")
    func milestones() {
        let requests = plan(activeState())
        #expect(requests.map(\.step) == [1, 2, 3])
        for (request, days) in zip(requests, [1, 3, 7]) {
            #expect(request.date.timeIntervalSince(start) >= Double(days) * 86_400)
            var calendar = Calendar(identifier: .gregorian); calendar.timeZone = zone
            #expect(calendar.component(.hour, from: request.date) == 18)
        }
    }
    @Test("late consent cannot deliver before a complete milestone")
    func eveningConsent() {
        var state = activeState()
        state.consentAt = ISO8601DateFormatter().date(from: "2026-10-09T20:00:00Z")!
        let requests = plan(state)
        #expect(requests.first?.date == ISO8601DateFormatter().date(from: "2026-10-11T18:00:00Z"))
    }
    @Test("holdout, no consent and terminated campaigns never schedule")
    func exclusions() {
        var state = activeState(); state.assignment = .holdout
        #expect(plan(state).isEmpty)
        state.assignment = .sequence; state.consent = false
        #expect(plan(state).isEmpty)
        state.consent = true; state.campaignCancelled = true
        #expect(plan(state).isEmpty)
    }
    @Test("a utility collision skips only its step")
    func utilityCollision() {
        let state = activeState(); let first = plan(state)[0]
        #expect(plan(state, utilities: [first.date.addingTimeInterval(3_600)]).map(\.step) == [2, 3])
        #expect(plan(state, utilities: [first.date.addingTimeInterval(86_400)]).count == 3)
    }
    @Test("three-per-month and 48-hour caps include legacy history")
    func caps() {
        var state = activeState(); let first = plan(state)[0]
        state.history = [first.date.addingTimeInterval(-86_400)]
        #expect(plan(state).map(\.step) == [2, 3])
        state.history = [9, 15, 20].map { first.date.addingTimeInterval(Double(-$0) * 86_400) }
        #expect(plan(state).isEmpty)
    }
    @Test("recent activity skips rather than moving the campaign anchor")
    func activity() {
        var state = activeState(); let first = plan(state)[0]
        state.lastActivity = first.date.addingTimeInterval(-3_600)
        #expect(plan(state).map(\.step) == [2, 3])
        state.lastActivity = first.date.addingTimeInterval(-86_400)
        #expect(plan(state).count == 3)
    }
    @Test("elapsed reservations consume budget once; completed campaigns never restart")
    func elapsed() {
        var state = activeState(); state.pending = plan(state)
        let end = state.pending.last!.date
        state.reconcileElapsed(now: end)
        state.reconcileElapsed(now: end)
        #expect(state.history.count == 3); #expect(state.episodeSteps == [1, 2, 3])
        #expect(RetentionNotificationPlanner.reservations(state: state, now: end.addingTimeInterval(40 * 86_400), timeZone: zone, utilityDates: []).isEmpty)
    }
    @Test("copy follows scan state and only repeat day three selects Bulk")
    func destination() {
        var state = activeState()
        let first = RetentionNotificationPlanner.request(plan(state)[0], locale: Locale(identifier: "en"))
        #expect(first.title == "Meet your first minifigure")
        state.recognitionFailed = true
        #expect(RetentionNotificationPlanner.request(plan(state)[0], locale: Locale(identifier: "en")).title == "Try one figure at a time")
        state.recognitionFailed = false; state.hasSuccessfulScan = true
        let requests = plan(state).map { RetentionNotificationPlanner.request($0, locale: Locale(identifier: "en")) }
        #expect(requests[1].deepLink.query?.contains("mode=bulk") == true)
        #expect(requests[0].deepLink.query?.contains("mode=single") == true)
        #expect(requests[2].deepLink.query?.contains("mode=single") == true)
        #expect(requests.allSatisfy { $0.deepLink.host == "scan" })
    }
    @Test("daylight-saving change preserves the local hour and elapsed minimum")
    func daylightSaving() {
        var state = activeState()
        state.consentAt = ISO8601DateFormatter().date(from: "2026-10-02T05:00:00Z")!
        let zone = TimeZone(identifier: "Australia/Melbourne")!
        let reservations = RetentionNotificationPlanner.reservations(state: state, now: state.consentAt!, timeZone: zone, utilityDates: [])
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = zone
        #expect(reservations.map(\.step) == [1, 3]) // Spring-forward would make step 2 only 47 hours later.
        #expect(reservations.allSatisfy { calendar.component(.hour, from: $0.date) == 18 })
        let daysByStep = [1: 1, 2: 3, 3: 7]
        for request in reservations {
            #expect(request.date.timeIntervalSince(state.consentAt!) >= Double(daysByStep[request.step]!) * 86_400)
        }
    }
    @Test("legacy migration preserves invitation, assignment and elapsed budget but revokes consent")
    func migration() throws {
        let defaults = UserDefaults(suiteName: "RetentionMigration.\(UUID().uuidString)")!
        let json = #"{"assignment":"sequence","eligibleAt":100,"invitationSeen":true,"consent":true,"hasSuccessfulScan":true,"hasCollection":false,"episodeSteps":[],"history":[],"pending":[{"step":1,"date":100,"hasCollection":false}]}"#
        defaults.set(Data(json.utf8), forKey: "brickvalue_retention_state_v1")
        let migrated = RetentionNotificationState.load(defaults: defaults, now: start)
        #expect(migrated.assignment == .sequence); #expect(migrated.invitationSeen)
        #expect(!migrated.consent); #expect(migrated.consentAt == nil); #expect(migrated.pending.isEmpty)
        #expect(migrated.campaignVersion == 2)
    }
    @Test("old policy responses default retention to disabled")
    func oldPolicy() throws {
        let data = Data(#"{"enabled":true,"scanReset":true,"trialEnding":true,"accountAction":true}"#.utf8)
        #expect(try JSONDecoder().decode(MonetizationPolicy.Notifications.self, from: data).retention == false)
    }
    @Test("notification destination waits for onboarding and survives a router restart")
    @MainActor func routing() {
        let defaults = UserDefaults(suiteName: "RetentionRouter.\(UUID().uuidString)")!
        let router = AppRouter(defaults: defaults)
        router.handleNotification(url: URL(string: "brickval://scan?mode=bulk")!, onboardingCompleted: false)
        #expect(router.notificationNavigationRevision == 0)
        let restarted = AppRouter(defaults: defaults)
        restarted.completeNotificationOnboarding()
        #expect(restarted.notificationNavigationRevision == 1)
        #expect(restarted.consumeNotificationScanIntent() == .bulk)
        #expect(restarted.consumeNotificationScanIntent() == nil)
        restarted.handleNotification(url: URL(string: "brickval://subscription")!)
        #expect(restarted.selectedTab == .settings)
        #expect(restarted.settingsPath == [.subscription])
    }
}
