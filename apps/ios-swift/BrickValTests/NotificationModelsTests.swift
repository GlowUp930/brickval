import Foundation
import Testing
@testable import BrickVal

@Suite("Notification scheduling")
struct NotificationModelsTests {
    @Test("scan reset is delivered after quiet hours when needed")
    func scanResetRespectsQuietHours() {
        let timeZone = TimeZone(secondsFromGMT: 0)!
        let calendar = Calendar(identifier: .gregorian)
        let now = Date(timeIntervalSince1970: 1_755_194_400) // 2025-08-14 18:00 UTC
        let reset = Date(timeIntervalSince1970: 1_755_205_200) // 2025-08-14 21:00 UTC

        let request = BrickValNotificationSchedulePlanner.scanReset(
            resetDate: reset,
            now: now,
            timeZone: timeZone,
            calendar: calendar
        )

        #expect(request?.title == "Your free scans are ready")
        #expect(request?.fireDate == Date(timeIntervalSince1970: 1_755_248_400)) // 2025-08-15 09:00 UTC
    }

    @Test("scan reset scheduled during the day stays at the reset time")
    func scanResetUsesResetTimeDuringTheDay() {
        let timeZone = TimeZone(secondsFromGMT: 0)!
        let calendar = Calendar(identifier: .gregorian)
        let now = Date(timeIntervalSince1970: 1_755_158_400) // 2025-08-14 08:00 UTC
        let reset = Date(timeIntervalSince1970: 1_755_162_000) // 2025-08-14 09:00 UTC

        let request = BrickValNotificationSchedulePlanner.scanReset(
            resetDate: reset,
            now: now,
            timeZone: timeZone,
            calendar: calendar
        )

        #expect(request?.fireDate == reset)
    }

    @Test("trial reminders are exactly 48 hours before renewal")
    func trialReminderUsesTwoDayLead() {
        let now = Date(timeIntervalSince1970: 1_755_158_400) // 2025-08-14 08:00 UTC
        let expiration = now.addingTimeInterval(7 * 24 * 60 * 60 + 2 * 60 * 60)

        let request = BrickValNotificationSchedulePlanner.trialEnding(
            expirationDate: expiration,
            willRenew: true,
            now: now,
            timeZone: TimeZone(secondsFromGMT: 0)!,
            calendar: Calendar(identifier: .gregorian)
        )

        #expect(request?.category == .trialEnding)
        #expect(request?.fireDate == expiration.addingTimeInterval(-48 * 60 * 60))
    }

    @Test("trial reminder is omitted when renewal is cancelled")
    func cancelledTrialDoesNotScheduleReminder() {
        let request = BrickValNotificationSchedulePlanner.trialEnding(
            expirationDate: Date(timeIntervalSince1970: 1_755_763_200),
            willRenew: false,
            now: Date(timeIntervalSince1970: 1_755_115_200),
            timeZone: TimeZone(secondsFromGMT: 0)!,
            calendar: Calendar(identifier: .gregorian)
        )

        #expect(request == nil)
    }

    @Test("notification links open the correct destination")
    func notificationLinksAreActionable() {
        #expect(BrickValNotificationCategory.scanReset.deepLink.absoluteString == "brickval://scan")
        #expect(BrickValNotificationCategory.trialEnding.deepLink.absoluteString == "brickval://settings")
        #expect(BrickValNotificationCategory.accountAction.deepLink.absoluteString == "brickval://settings")
    }
}
