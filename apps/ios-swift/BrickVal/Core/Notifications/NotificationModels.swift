import Foundation

enum BrickValNotificationCategory: String, CaseIterable, Codable, Hashable, Sendable {
    case scanReset
    case trialEnding
    case accountAction

    var requestIdentifier: String {
        "brickvalue.notification.\(rawValue)"
    }

    var deepLink: URL {
        switch self {
        case .scanReset:
            URL(string: "brickval://scan")!
        case .trialEnding, .accountAction:
            URL(string: "brickval://settings")!
        }
    }
}

struct BrickValLocalNotificationRequest: Equatable, Sendable {
    let identifier: String
    let category: BrickValNotificationCategory
    let title: String
    let body: String
    let fireDate: Date
    let deepLink: URL
}

struct BrickValNotificationDeviceRegistration: Codable, Equatable, Sendable {
    let deviceID: String
    let apnsToken: String
    let environment: String
    let subscriberID: String?
    let accessCohort: String?
    let accountAlertsEnabled: Bool
}

enum BrickValNotificationAuthorizationStatus: Equatable, Sendable {
    case notDetermined
    case denied
    case authorized
    case provisional
    case ephemeral

    var canSchedule: Bool {
        switch self {
        case .authorized, .provisional, .ephemeral: true
        case .notDetermined, .denied: false
        }
    }
}

struct SubscriptionReminderState: Equatable, Sendable {
    let isActive: Bool
    let isTrial: Bool
    let willRenew: Bool
    let expirationDate: Date?
    let productID: String?

    init(
        isActive: Bool,
        isTrial: Bool,
        willRenew: Bool,
        expirationDate: Date?,
        productID: String? = nil
    ) {
        self.isActive = isActive
        self.isTrial = isTrial
        self.willRenew = willRenew
        self.expirationDate = expirationDate
        self.productID = productID
    }
}

enum BrickValNotificationSchedulePlanner {
    static func scanReset(
        resetDate: Date,
        now: Date,
        timeZone: TimeZone = .autoupdatingCurrent,
        calendar: Calendar = .autoupdatingCurrent
    ) -> BrickValLocalNotificationRequest? {
        guard resetDate > now else { return nil }
        let fireDate = deliveryDate(
            preferredDate: resetDate,
            now: now,
            timeZone: timeZone,
            calendar: calendar
        )
        return BrickValLocalNotificationRequest(
            identifier: BrickValNotificationCategory.scanReset.requestIdentifier,
            category: .scanReset,
            title: "Your free scans are ready",
            body: "Scan another minifigure when you’re ready.",
            fireDate: fireDate,
            deepLink: BrickValNotificationCategory.scanReset.deepLink
        )
    }

    static func trialEnding(
        expirationDate: Date,
        willRenew: Bool,
        now: Date,
        timeZone: TimeZone = .autoupdatingCurrent,
        calendar: Calendar = .autoupdatingCurrent
    ) -> BrickValLocalNotificationRequest? {
        guard willRenew, expirationDate > now else { return nil }
        let preferredDate = expirationDate.addingTimeInterval(-48 * 60 * 60)
        guard preferredDate > now else { return nil }
        return BrickValLocalNotificationRequest(
            identifier: BrickValNotificationCategory.trialEnding.requestIdentifier,
            category: .trialEnding,
            title: "Your BrickValue trial ends in 2 days",
            body: "Review your plan before it renews.",
            fireDate: deliveryDate(
                preferredDate: preferredDate,
                now: now,
                timeZone: timeZone,
                calendar: calendar
            ),
            deepLink: BrickValNotificationCategory.trialEnding.deepLink
        )
    }

    private static func deliveryDate(
        preferredDate: Date,
        now: Date,
        timeZone: TimeZone,
        calendar: Calendar
    ) -> Date {
        var calendar = calendar
        calendar.timeZone = timeZone
        var components = calendar.dateComponents(
            [.year, .month, .day, .hour, .minute, .second],
            from: preferredDate
        )
        let hour = components.hour ?? 9

        if hour < 9 {
            components.hour = 9
            components.minute = 0
            components.second = 0
        } else if hour >= 20 {
            components.day = (components.day ?? 1) + 1
            components.hour = 9
            components.minute = 0
            components.second = 0
        }

        let adjusted = calendar.date(from: components) ?? preferredDate
        return max(adjusted, now.addingTimeInterval(60))
    }
}
