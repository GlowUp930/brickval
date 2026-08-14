import Foundation
import Observation
import UIKit
import UserNotifications

@MainActor
protocol BrickValNotificationCenterClient: AnyObject {
    func authorizationStatus() async -> BrickValNotificationAuthorizationStatus
    func requestAuthorization() async throws -> Bool
    func add(_ request: BrickValLocalNotificationRequest) async throws
    func removePendingNotifications(withIdentifiers identifiers: [String])
}

@MainActor
final class SystemBrickValNotificationCenter: BrickValNotificationCenterClient {
    private let center = UNUserNotificationCenter.current()

    func authorizationStatus() async -> BrickValNotificationAuthorizationStatus {
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized: return .authorized
        case .denied: return .denied
        case .provisional: return .provisional
        case .ephemeral: return .ephemeral
        case .notDetermined: return .notDetermined
        @unknown default: return .notDetermined
        }
    }

    func requestAuthorization() async throws -> Bool {
        try await center.requestAuthorization(options: [.alert, .sound])
    }

    func add(_ request: BrickValLocalNotificationRequest) async throws {
        let content = UNMutableNotificationContent()
        content.title = request.title
        content.body = request.body
        content.sound = .default
        content.userInfo = ["deepLink": request.deepLink.absoluteString]

        var calendar = Calendar.autoupdatingCurrent
        calendar.timeZone = .autoupdatingCurrent
        let components = calendar.dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: request.fireDate
        )
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        try await center.add(
            UNNotificationRequest(
                identifier: request.identifier,
                content: content,
                trigger: trigger
            )
        )
    }

    func removePendingNotifications(withIdentifiers identifiers: [String]) {
        center.removePendingNotificationRequests(withIdentifiers: identifiers)
    }
}

@Observable
@MainActor
final class NotificationCoordinator: NSObject, UNUserNotificationCenterDelegate {
    private(set) var authorizationStatus: BrickValNotificationAuthorizationStatus = .notDetermined
    private(set) var scanResetReminderEnabled: Bool
    private(set) var trialReminderEnabled: Bool
    private(set) var accountAlertsEnabled: Bool
    private(set) var subscriptionState: SubscriptionReminderState?
    private(set) var lastError: String?
    private(set) var policy: MonetizationPolicy.Notifications

    @ObservationIgnored private let center: BrickValNotificationCenterClient
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let now: @Sendable () -> Date
    @ObservationIgnored private let timeZone: TimeZone
    @ObservationIgnored private let deviceID: String
    @ObservationIgnored private let environment: String
    @ObservationIgnored private var apnsToken: String?
    @ObservationIgnored private var subscriberID: String?
    @ObservationIgnored private var accessCohort: String?
    @ObservationIgnored private var deviceRegistrationHandler: (@Sendable (BrickValNotificationDeviceRegistration) async throws -> Void)?
    @ObservationIgnored private var responseHandler: (@MainActor @Sendable (URL) -> Void)?

    init(
        center: BrickValNotificationCenterClient = SystemBrickValNotificationCenter(),
        defaults: UserDefaults = .standard,
        now: @escaping @Sendable () -> Date = Date.init,
        timeZone: TimeZone = .autoupdatingCurrent
    ) {
        self.center = center
        self.defaults = defaults
        self.now = now
        self.timeZone = timeZone
        if let storedDeviceID = defaults.string(forKey: Keys.deviceID) {
            deviceID = storedDeviceID
        } else {
            let newDeviceID = UUID().uuidString
            deviceID = newDeviceID
            defaults.set(newDeviceID, forKey: Keys.deviceID)
        }
#if DEBUG
        environment = "sandbox"
#else
        environment = "production"
#endif
        subscriptionState = nil
        policy = MonetizationPolicy.phaseOne.notifications
        scanResetReminderEnabled = defaults.bool(forKey: Keys.scanResetReminder)
        trialReminderEnabled = defaults.bool(forKey: Keys.trialReminder)
        accountAlertsEnabled = defaults.bool(forKey: Keys.accountAlerts)
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }

    func refreshAuthorizationStatus() async {
        authorizationStatus = await center.authorizationStatus()
    }

    func setResponseHandler(_ handler: @escaping @MainActor @Sendable (URL) -> Void) {
        responseHandler = handler
    }

    func setDeviceRegistrationHandler(
        _ handler: @escaping @Sendable (BrickValNotificationDeviceRegistration) async throws -> Void
    ) {
        deviceRegistrationHandler = handler
        syncDeviceRegistration()
    }

    func setSubscriberID(_ subscriberID: String?) {
        self.subscriberID = subscriberID
        syncDeviceRegistration()
    }

    func setAccessCohort(_ cohort: String?) {
        accessCohort = cohort
        syncDeviceRegistration()
    }

    func updatePolicy(_ policy: MonetizationPolicy.Notifications) {
        self.policy = policy
        if !policy.enabled || !policy.scanReset {
            cancel(category: .scanReset)
        }
        if !policy.enabled || !policy.trialEnding {
            cancel(category: .trialEnding)
        }
        if !policy.enabled || !policy.accountAction {
            cancel(category: .accountAction)
        }
    }

    func setAPNsDeviceToken(_ token: String) {
        apnsToken = token
        syncDeviceRegistration()
    }

    func requestScanResetReminder(resetDate: Date) async -> Bool {
        guard policy.enabled, policy.scanReset else { return false }
        let granted = await requestPermission()
        guard granted,
              let request = BrickValNotificationSchedulePlanner.scanReset(
                resetDate: resetDate,
                now: now(),
                timeZone: timeZone
              )
        else { return false }

        do {
            center.removePendingNotifications(withIdentifiers: [BrickValNotificationCategory.scanReset.requestIdentifier])
            try await center.add(request)
            scanResetReminderEnabled = true
            defaults.set(true, forKey: Keys.scanResetReminder)
            lastError = nil
            return true
        } catch {
            lastError = "We couldn’t schedule the scan reminder."
            return false
        }
    }

    func requestTrialReminder(expirationDate: Date, willRenew: Bool) async -> Bool {
        guard policy.enabled, policy.trialEnding else { return false }
        let granted = await requestPermission()
        guard granted else { return false }
        trialReminderEnabled = true
        defaults.set(true, forKey: Keys.trialReminder)
        await updateTrialReminder(expirationDate: expirationDate, willRenew: willRenew)
        return lastError == nil
    }

    func updateSubscription(_ state: SubscriptionReminderState) async {
        subscriptionState = state
        await updateTrialReminder(
            expirationDate: state.isActive && state.isTrial ? state.expirationDate : nil,
            willRenew: state.willRenew
        )
    }

    func requestAccountAlerts() async -> Bool {
        guard policy.enabled, policy.accountAction else { return false }
        let granted = await requestPermission()
        guard granted else { return false }
        accountAlertsEnabled = true
        defaults.set(true, forKey: Keys.accountAlerts)
        syncDeviceRegistration()
        lastError = nil
        return true
    }

    func updateTrialReminder(expirationDate: Date?, willRenew: Bool) async {
        let identifier = BrickValNotificationCategory.trialEnding.requestIdentifier
        center.removePendingNotifications(withIdentifiers: [identifier])

        guard trialReminderEnabled,
              policy.enabled,
              policy.trialEnding,
              authorizationStatus.canSchedule,
              let expirationDate,
              let request = BrickValNotificationSchedulePlanner.trialEnding(
                expirationDate: expirationDate,
                willRenew: willRenew,
                now: now(),
                timeZone: timeZone
              )
        else { return }

        do {
            try await center.add(request)
            lastError = nil
        } catch {
            lastError = "We couldn’t schedule the trial reminder."
        }
    }

    func cancel(category: BrickValNotificationCategory) {
        center.removePendingNotifications(withIdentifiers: [category.requestIdentifier])
        switch category {
        case .scanReset:
            scanResetReminderEnabled = false
            defaults.set(false, forKey: Keys.scanResetReminder)
        case .trialEnding:
            trialReminderEnabled = false
            defaults.set(false, forKey: Keys.trialReminder)
        case .accountAction:
            accountAlertsEnabled = false
            defaults.set(false, forKey: Keys.accountAlerts)
            syncDeviceRegistration()
        }
    }

    func handleNotificationResponse(_ response: UNNotificationResponse) {
        guard let value = response.notification.request.content.userInfo["deepLink"] as? String,
              let url = URL(string: value)
        else { return }
        responseHandler?(url)
    }

    private func requestPermission() async -> Bool {
        do {
            let granted = try await center.requestAuthorization()
            await refreshAuthorizationStatus()
            guard granted else {
                lastError = "Notifications are off. You can enable them in Settings."
                return false
            }
            UIApplication.shared.registerForRemoteNotifications()
            lastError = nil
            return true
        } catch {
            lastError = "Notifications are unavailable right now."
            return false
        }
    }

    private func syncDeviceRegistration() {
        guard let apnsToken, let deviceRegistrationHandler else { return }
        let registration = BrickValNotificationDeviceRegistration(
            deviceID: deviceID,
            apnsToken: apnsToken,
            environment: environment,
            subscriberID: subscriberID,
            accessCohort: accessCohort,
            accountAlertsEnabled: accountAlertsEnabled
        )
        Task {
            try? await deviceRegistrationHandler(registration)
        }
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let deepLink = response.notification.request.content.userInfo["deepLink"] as? String
        await MainActor.run { [weak self] in
            guard let deepLink, let url = URL(string: deepLink) else { return }
            self?.responseHandler?(url)
        }
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }

    private enum Keys {
        static let scanResetReminder = "brickvalue_notification_scan_reset_enabled"
        static let trialReminder = "brickvalue_notification_trial_enabled"
        static let accountAlerts = "brickvalue_notification_account_enabled"
        static let deviceID = "brickvalue_notification_device_id"
    }
}
