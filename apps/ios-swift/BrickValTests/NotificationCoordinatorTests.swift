import Foundation
import Testing
import UserNotifications
@testable import BrickVal

@MainActor
struct NotificationCoordinatorTests {
    @Test("scan reset requests permission only after an explicit reminder action")
    func scanResetRequiresExplicitAction() async {
        let center = TestNotificationCenter()
        let defaults = UserDefaults(suiteName: "NotificationCoordinatorTests.\(UUID().uuidString)")!
        let coordinator = NotificationCoordinator(
            center: center,
            defaults: defaults,
            now: { Date(timeIntervalSince1970: 1_755_158_400) },
            timeZone: TimeZone(secondsFromGMT: 0)!
        )

        #expect(center.authorizationRequests == 0)
        #expect(coordinator.scanResetReminderEnabled == false)

        let scheduled = await coordinator.requestScanResetReminder(
            resetDate: Date(timeIntervalSince1970: 1_755_162_000)
        )

        #expect(scheduled)
        #expect(center.authorizationRequests == 1)
        #expect(center.requests.count == 1)
        #expect(coordinator.scanResetReminderEnabled)
    }

    @Test("a disabled remote notification flag blocks scheduling without prompting")
    func disabledPolicyBlocksScheduling() async {
        let center = TestNotificationCenter()
        let defaults = UserDefaults(suiteName: "NotificationCoordinatorTests.\(UUID().uuidString)")!
        let coordinator = NotificationCoordinator(center: center, defaults: defaults)
        coordinator.updatePolicy(.init(enabled: false, scanReset: true, trialEnding: true, accountAction: true))

        let scheduled = await coordinator.requestScanResetReminder(
            resetDate: Date(timeIntervalSinceNow: 86_400)
        )

        #expect(scheduled == false)
        #expect(center.authorizationRequests == 0)
        #expect(center.requests.isEmpty)
    }

    @Test("entitlement changes remove a cancelled trial reminder")
    func cancelledTrialReminderIsRemoved() async {
        let center = TestNotificationCenter()
        let defaults = UserDefaults(suiteName: "NotificationCoordinatorTests.\(UUID().uuidString)")!
        let now = Date(timeIntervalSince1970: 1_755_158_400)
        let coordinator = NotificationCoordinator(
            center: center,
            defaults: defaults,
            now: { now },
            timeZone: TimeZone(secondsFromGMT: 0)!
        )

        let scheduled = await coordinator.requestTrialReminder(
            expirationDate: now.addingTimeInterval(7 * 24 * 60 * 60 + 2 * 60 * 60),
            willRenew: true
        )
        #expect(scheduled)
        #expect(center.requests.count == 1)

        await coordinator.updateSubscription(SubscriptionReminderState(
            isActive: true,
            isTrial: true,
            willRenew: false,
            expirationDate: now.addingTimeInterval(7 * 24 * 60 * 60)
        ))

        #expect(center.removedIdentifiers.contains(BrickValNotificationCategory.trialEnding.requestIdentifier))
    }
}

@MainActor
private final class TestNotificationCenter: BrickValNotificationCenterClient {
    var status: BrickValNotificationAuthorizationStatus = .notDetermined
    var authorizationRequests = 0
    var grantsAuthorization = true
    var failsScheduling = false
    var requests: [BrickValLocalNotificationRequest] = []
    var removedIdentifiers: [String] = []

    func authorizationStatus() async -> BrickValNotificationAuthorizationStatus {
        status
    }

    func requestAuthorization() async throws -> Bool {
        authorizationRequests += 1
        status = grantsAuthorization ? .authorized : .denied
        return grantsAuthorization
    }

    func add(_ request: BrickValLocalNotificationRequest) async throws {
        if failsScheduling { throw URLError(.notConnectedToInternet) }
        requests.append(request)
    }

    func removePendingNotifications(withIdentifiers identifiers: [String]) {
        removedIdentifiers.append(contentsOf: identifiers)
        requests.removeAll { identifiers.contains($0.identifier) }
    }
}

@MainActor
struct RetentionCoordinatorTests {
    private func fixture(assignment: RetentionNotificationState.Assignment = .sequence) -> (NotificationCoordinator, TestNotificationCenter, UserDefaults) {
        let defaults = UserDefaults(suiteName: "RetentionCoordinatorTests.\(UUID().uuidString)")!
        let center = TestNotificationCenter()
        let coordinator = NotificationCoordinator(center: center, defaults: defaults,
            now: { Date(timeIntervalSince1970: 1_790_424_000) }, timeZone: TimeZone(secondsFromGMT: 0)!, assignRetention: { assignment })
        coordinator.updatePolicy(.init(enabled: true, scanReset: true, trialEnding: true, accountAction: true, retention: true))
        return (coordinator, center, defaults)
    }
    @Test("no permission prompt before explicit consent; both reservations scheduled afterward")
    func explicitConsent() async {
        let (coordinator, center, _) = fixture()
        coordinator.recordMeaningfulActivity("usable_scan", hasCollection: false, usableScan: true)
        #expect(coordinator.showsRetentionInvitation)
        coordinator.markRetentionInvitationSeen()
        await coordinator.reconcileRetention()
        #expect(center.authorizationRequests == 0); #expect(center.requests.isEmpty)
        #expect(await coordinator.requestRetentionReminders())
        #expect(center.requests.count == 2)
        #expect(center.requests.allSatisfy { $0.category == .retention })
        coordinator.cancel(category: .retention)
        await coordinator.reconcileRetention()
        #expect(center.requests.isEmpty)
    }
    @Test("system refusal leaves consent off and schedules nothing")
    func permissionDenied() async {
        let (coordinator, center, _) = fixture()
        center.grantsAuthorization = false
        coordinator.recordMeaningfulActivity("usable_scan", hasCollection: false, usableScan: true)
        #expect(await coordinator.requestRetentionReminders() == false)
        #expect(!coordinator.retentionState.consent)
        #expect(center.requests.isEmpty)
        #expect(coordinator.authorizationStatus == .denied)
    }
    @Test("scheduling failure never leaves an orphan second reminder or a success event")
    func schedulingFailed() async {
        let (coordinator, center, _) = fixture()
        center.failsScheduling = true
        var events: [String] = []
        coordinator.eventHandler = { event, _ in events.append(event) }
        coordinator.recordMeaningfulActivity("usable_scan", hasCollection: false, usableScan: true)
        #expect(await coordinator.requestRetentionReminders() == false)
        #expect(center.requests.isEmpty)
        #expect(!events.contains("notification_scheduled"))
        #expect(events.contains("notification_schedule_failed"))
    }
    @Test("requested scan reminder replaces conflicting retention dates")
    func resetCollision() async {
        let (coordinator, center, _) = fixture()
        coordinator.recordMeaningfulActivity("usable_scan", hasCollection: false, usableScan: true)
        _ = await coordinator.requestRetentionReminders()
        let date = coordinator.retentionState.pending[0].date
        #expect(await coordinator.requestScanResetReminder(resetDate: date))
        #expect(center.requests.count == 1)
        #expect(center.requests.first?.category == .scanReset)
        coordinator.cancel(category: .scanReset)
        await coordinator.reconcileRetention()
        #expect(center.requests.count == 2)
    }
    @Test("holdout and access-blocked users never receive invitation or permission request")
    func holdoutAndLocked() async {
        let (coordinator, center, _) = fixture(assignment: .holdout)
        coordinator.recordMeaningfulActivity("usable_scan", hasCollection: false, usableScan: true)
        #expect(coordinator.retentionState.assignment == .holdout)
        #expect(!coordinator.showsRetentionInvitation)
        #expect(await coordinator.requestRetentionReminders() == false)
        #expect(center.authorizationRequests == 0)
        let (locked, _, _) = fixture()
        locked.recordMeaningfulActivity("usable_scan", hasCollection: false, usableScan: true, accessAllowed: false)
        #expect(locked.retentionState.assignment == nil)
        #expect(!locked.retentionState.hasSuccessfulScan)
    }
    @Test("invitation refusal survives restart and assignment stays stable")
    func restart() async {
        let (coordinator, center, defaults) = fixture()
        coordinator.recordMeaningfulActivity("usable_scan", hasCollection: false, usableScan: true)
        coordinator.markRetentionInvitationSeen(); coordinator.declineRetentionInvitation()
        let restarted = NotificationCoordinator(center: center, defaults: defaults, assignRetention: { .holdout })
        restarted.updatePolicy(.init(enabled: true, scanReset: true, trialEnding: true, accountAction: true, retention: true))
        restarted.recordMeaningfulActivity("usable_scan", hasCollection: false, usableScan: true)
        #expect(restarted.retentionState.assignment == .sequence)
        #expect(!restarted.showsRetentionInvitation)
        #expect(!restarted.retentionState.consent)
        await restarted.reconcileRetention()
        #expect(center.requests.isEmpty)
    }
    @Test("revoking system permission and remote policy removes pending reminders")
    func revocation() async {
        let (coordinator, center, _) = fixture()
        coordinator.recordMeaningfulActivity("usable_scan", hasCollection: false, usableScan: true)
        _ = await coordinator.requestRetentionReminders()
        center.status = .denied
        await coordinator.refreshAuthorizationStatus()
        #expect(center.requests.isEmpty)
        center.status = .authorized
        await coordinator.refreshAuthorizationStatus()
        #expect(center.requests.count == 2)
        coordinator.updatePolicy(.init(enabled: true, scanReset: true, trialEnding: true, accountAction: true, retention: false))
        await coordinator.reconcileRetention()
        #expect(center.requests.isEmpty)
    }
    @Test("account switching cancels prior activity without reassigning the installation")
    func accountSwitch() async {
        let (coordinator, center, _) = fixture()
        coordinator.recordMeaningfulActivity("usable_scan", hasCollection: true, usableScan: true)
        _ = await coordinator.requestRetentionReminders()
        coordinator.setSubscriberID("another-account")
        await coordinator.reconcileRetention()
        #expect(center.requests.isEmpty)
        #expect(!coordinator.retentionState.hasSuccessfulScan)
        #expect(coordinator.retentionState.assignment == .sequence)
    }
    @Test("cold-launch tap is queued until router handler is ready")
    func coldLaunch() {
        let (coordinator, _, _) = fixture()
        coordinator.receiveResponse(url: URL(string: "brickval://collection")!, identifier: "retention.1")
        let router = AppRouter()
        coordinator.setResponseHandler { router.handleNotification(url: $0) }
        #expect(router.selectedTab == .collection)
    }
    @Test("new activity cancels old collection copy and keeps one copy per step")
    func activity() async {
        let (coordinator, center, _) = fixture()
        coordinator.recordMeaningfulActivity("usable_scan", hasCollection: false, usableScan: true)
        _ = await coordinator.requestRetentionReminders()
        coordinator.recordMeaningfulActivity("collection_save", hasCollection: true)
        await coordinator.reconcileRetention()
        #expect(center.requests.count == 2)
        #expect(center.requests.first?.deepLink.host == "collection")
        await coordinator.reconcileRetention()
        #expect(center.requests.count == 2)
    }
}
