import Foundation
import Testing
@testable import BrickVal

struct RetentionNotificationTests {
    private let zone = TimeZone(secondsFromGMT: 0)!
    private let start = Date(timeIntervalSince1970: 1_790_424_000) // deterministic fixture
    private func activeState() -> RetentionNotificationState {
        var state = RetentionNotificationState()
        state.assignment = .sequence
        state.consent = true
        state.hasSuccessfulScan = true
        state.lastActivity = start
        return state
    }
    private func plan(_ state: RetentionNotificationState, utilities: [Date] = []) -> [RetentionNotificationState.Reservation] {
        RetentionNotificationPlanner.reservations(state: state, now: start, timeZone: zone, utilityDates: utilities)
    }

    @Test("both inactive milestones reserve 6 PM, no earlier than seven days")
    func milestones() {
        let requests = plan(activeState())
        #expect(requests.count == 2)
        #expect(requests.map(\.step) == [1, 2])
        #expect(requests[0].date.timeIntervalSince(start) >= 7 * 86_400)
        for request in requests {
            var calendar = Calendar(identifier: .gregorian); calendar.timeZone = zone
            #expect(calendar.component(.hour, from: request.date) == 18)
        }
    }
    @Test("late-evening activity retains the delayed milestone during foreground reconciliation")
    func eveningActivity() {
        var state = activeState()
        state.lastActivity = ISO8601DateFormatter().date(from: "2026-09-26T20:00:00Z")!
        let now = state.lastActivity!.addingTimeInterval(7 * 86_400)
        let requests = RetentionNotificationPlanner.reservations(state: state, now: now, timeZone: zone, utilityDates: [])
        #expect(requests.count == 2)
        #expect(requests.first?.date == ISO8601DateFormatter().date(from: "2026-10-04T18:00:00Z"))
    }
    @Test("holdout and lack of consent or usable scan never schedule")
    func exclusions() {
        var state = activeState(); state.assignment = .holdout
        #expect(plan(state).isEmpty)
        state.assignment = .sequence; state.consent = false
        #expect(plan(state).isEmpty)
        state.consent = true; state.hasSuccessfulScan = false
        #expect(plan(state).isEmpty)
    }
    @Test("utility collision skips first and prevents orphan second reminder")
    func utilityCollision() {
        let state = activeState(); let first = plan(state)[0]
        #expect(plan(state, utilities: [first.date.addingTimeInterval(3_600)]).isEmpty)
        #expect(plan(state, utilities: [first.date.addingTimeInterval(86_400)]).count == 2)
    }
    @Test("rolling thirty-day and seven-day caps apply across new episodes")
    func caps() {
        var state = activeState(); let first = plan(state)[0]
        state.history = [first.date.addingTimeInterval(-86_400)]
        #expect(plan(state).isEmpty)
        state.history = [first.date.addingTimeInterval(-9 * 86_400), first.date.addingTimeInterval(-15 * 86_400)]
        #expect(plan(state).isEmpty)
    }
    @Test("elapsed reservations count conservatively without claiming delivery")
    func elapsed() {
        var state = activeState(); state.pending = plan(state)
        let date = state.pending[0].date
        state.reconcileElapsed(now: date)
        #expect(state.history == [date]); #expect(state.episodeSteps == [1]); #expect(state.pending.count == 1)
        state.reconcileElapsed(now: date)
        #expect(state.history.count == 1)
        #expect(RetentionNotificationPlanner.reservations(state: state, now: date, timeZone: zone, utilityDates: []).map(\.step) == [2])
    }
    @Test("collection presence chooses destination without revealing details")
    func destination() {
        var state = activeState()
        #expect(RetentionNotificationPlanner.request(plan(state)[0], locale: Locale(identifier: "en")).deepLink.host == "scan")
        state.hasCollection = true
        let reservations = plan(state)
        #expect(RetentionNotificationPlanner.request(reservations[0], locale: Locale(identifier: "en")).deepLink.host == "collection")
        #expect(RetentionNotificationPlanner.request(reservations[1], locale: Locale(identifier: "en")).deepLink.host == "scan")
    }
    @Test("calendar days preserve local evening through daylight saving")
    func daylightSaving() {
        let activity = ISO8601DateFormatter().date(from: "2026-09-30T05:00:00Z")!
        var state = activeState(); state.lastActivity = activity
        let zone = TimeZone(identifier: "Australia/Melbourne")!
        let reservations = RetentionNotificationPlanner.reservations(state: state, now: activity, timeZone: zone, utilityDates: [])
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = zone
        #expect(reservations.count == 2)
        #expect(reservations.allSatisfy { calendar.component(.hour, from: $0.date) == 18 })
    }
    @Test("old policy responses default retention to disabled")
    func oldPolicy() throws {
        let data = Data(#"{"enabled":true,"scanReset":true,"trialEnding":true,"accountAction":true}"#.utf8)
        #expect(try JSONDecoder().decode(MonetizationPolicy.Notifications.self, from: data).retention == false)
    }
    @Test("deep links clear old navigation and subscription route is explicit")
    @MainActor func routing() {
        let router = AppRouter()
        router.handleNotification(url: URL(string: "brickval://subscription")!)
        #expect(router.notificationNavigationRevision == 1)
        #expect(router.selectedTab == .settings)
        #expect(router.settingsPath == [.subscription])
        router.handle(url: URL(string: "brickval://collection")!)
        #expect(router.selectedTab == .collection); #expect(router.collectionPath.isEmpty)
    }
}
