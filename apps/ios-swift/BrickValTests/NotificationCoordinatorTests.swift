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
    var requests: [BrickValLocalNotificationRequest] = []
    var removedIdentifiers: [String] = []

    func authorizationStatus() async -> BrickValNotificationAuthorizationStatus {
        status
    }

    func requestAuthorization() async throws -> Bool {
        authorizationRequests += 1
        status = .authorized
        return true
    }

    func add(_ request: BrickValLocalNotificationRequest) async throws {
        requests.append(request)
    }

    func removePendingNotifications(withIdentifiers identifiers: [String]) {
        removedIdentifiers.append(contentsOf: identifiers)
        requests.removeAll { identifiers.contains($0.identifier) }
    }
}
