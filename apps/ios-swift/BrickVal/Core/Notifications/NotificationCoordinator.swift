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
        content.userInfo = ["deepLink": request.deepLink.absoluteString, "notification_category": request.category.rawValue, "notification_id": request.identifier]

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

    private(set) var retentionState: RetentionNotificationState
    private(set) var showsRetentionInvitation = false
    @ObservationIgnored var eventHandler: ((String, [String: Any]) -> Void)?
    @ObservationIgnored private var pendingResponseURL: URL?
    @ObservationIgnored private var schedulingTask: Task<Void, Never>?
    @ObservationIgnored private var lastNotificationTap: Date?
    @ObservationIgnored private let assignRetention: () -> RetentionNotificationState.Assignment
    @ObservationIgnored private let center: BrickValNotificationCenterClient
    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let now: @Sendable () -> Date
    @ObservationIgnored private let timeZone: TimeZone
    @ObservationIgnored private let deviceID: String
    @ObservationIgnored private let environment: String
    @ObservationIgnored private var apnsToken: String?
    @ObservationIgnored private var subscriberID: String?
    @ObservationIgnored private var accessCohort: String?
    @ObservationIgnored private var languageCode: String
    @ObservationIgnored private var deviceRegistrationHandler: (@Sendable (BrickValNotificationDeviceRegistration) async throws -> Void)?
    @ObservationIgnored private var responseHandler: (@MainActor @Sendable (URL) -> Void)?

    init(
        center: BrickValNotificationCenterClient = SystemBrickValNotificationCenter(),
        defaults: UserDefaults = .standard,
        now: @escaping @Sendable () -> Date = Date.init,
        timeZone: TimeZone = .autoupdatingCurrent,
        assignRetention: @escaping () -> RetentionNotificationState.Assignment = { Bool.random() ? .sequence : .holdout }
    ) {
        self.assignRetention = assignRetention
        retentionState = defaults.data(forKey: "brickvalue_retention_state_v1")
            .flatMap { try? JSONDecoder().decode(RetentionNotificationState.self, from: $0) } ?? RetentionNotificationState()
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
        languageCode = BrickValLocalization.effectiveLanguageCode
        subscriptionState = nil
        policy = MonetizationPolicy.phaseOne.notifications
        scanResetReminderEnabled = defaults.bool(forKey: Keys.scanResetReminder)
        trialReminderEnabled = defaults.bool(forKey: Keys.trialReminder)
        accountAlertsEnabled = defaults.bool(forKey: Keys.accountAlerts)
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }

    func refreshAuthorizationStatus() async {
        let previous = authorizationStatus
        authorizationStatus = await center.authorizationStatus()
        if previous != authorizationStatus {
            track("notification_authorization_changed", ["previous_status": String(describing: previous), "status": String(describing: authorizationStatus)])
        }
        if let state = subscriptionState {
            await updateTrialReminder(expirationDate: state.isActive && state.isTrial ? state.expirationDate : nil, willRenew: state.willRenew)
        }
        await reconcileRetention()
    }

    func setResponseHandler(_ handler: @escaping @MainActor @Sendable (URL) -> Void) {
        responseHandler = handler
        if let pendingResponseURL { handler(pendingResponseURL); self.pendingResponseURL = nil }
    }

    func setDeviceRegistrationHandler(
        _ handler: @escaping @Sendable (BrickValNotificationDeviceRegistration) async throws -> Void
    ) {
        deviceRegistrationHandler = handler
        syncDeviceRegistration()
    }

    func setSubscriberID(_ subscriberID: String?) {
        if retentionState.identity != subscriberID {
            retentionState.reconcileElapsed(now: now())
            // On upgrade there may be no retention identity yet. Preserve existing
            // requested reminders until a known account/activity context changes.
            if retentionState.identity != nil || retentionState.lastActivity != nil {
                cancel(category: .trialEnding)
                cancel(category: .scanReset)
                subscriptionState = nil
            }
            retentionState.pending = []
            retentionState.episodeSteps = []
            retentionState.lastActivity = nil
            retentionState.hasSuccessfulScan = false
            retentionState.hasCollection = false
            retentionState.identity = subscriberID
            showsRetentionInvitation = false
            persistRetention()
            Task { await reconcileRetention() }
        }
        self.subscriberID = subscriberID
        syncDeviceRegistration()
    }

    func setAccessCohort(_ cohort: String?) {
        accessCohort = cohort
        syncDeviceRegistration()
    }

    func updateLanguage(_ language: BrickValLanguage) {
        guard languageCode != language.rawValue else { return }
        languageCode = language.rawValue
        Task {
            if let state = subscriptionState {
                await updateTrialReminder(expirationDate: state.isActive && state.isTrial ? state.expirationDate : nil, willRenew: state.willRenew)
            }
            await reconcileRetention()
        }
        syncDeviceRegistration()
    }

    func updatePolicy(_ policy: MonetizationPolicy.Notifications) {
        self.policy = policy
        if !policy.enabled || !policy.retention { showsRetentionInvitation = false }
        Task { await reconcileRetention() }
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
        guard policy.enabled, policy.scanReset, accessCohort != "hard_trial", subscriptionState?.isActive != true else { return false }
        let granted = await requestPermission()
        guard granted,
              let request = BrickValNotificationSchedulePlanner.scanReset(
                resetDate: resetDate,
                now: now(),
                timeZone: timeZone,
                locale: Locale(identifier: languageCode)
              )
        else { return false }

        do {
            center.removePendingNotifications(withIdentifiers: [BrickValNotificationCategory.scanReset.requestIdentifier])
            try await center.add(request)
            scanResetReminderEnabled = true
            defaults.set(true, forKey: Keys.scanResetReminder)
            defaults.set(request.fireDate, forKey: "brickvalue_scan_reset_date")
            track("notification_scheduled", ["category": "scanReset"])
            await reconcileRetention()
            lastError = nil
            return true
        } catch {
            lastError = BrickValLocalization.localized("We couldn’t schedule the scan reminder.")
            return false
        }
    }

    func requestTrialReminder(expirationDate: Date, willRenew: Bool) async -> Bool {
        guard policy.enabled, policy.trialEnding,
              BrickValNotificationSchedulePlanner.trialEnding(expirationDate: expirationDate, willRenew: willRenew, now: now(), timeZone: timeZone) != nil
        else { return false }
        let granted = await requestPermission()
        guard granted else { return false }
        trialReminderEnabled = true
        defaults.set(true, forKey: Keys.trialReminder)
        await updateTrialReminder(expirationDate: expirationDate, willRenew: willRenew)
        return lastError == nil
    }

    func updateSubscription(_ state: SubscriptionReminderState) async {
        subscriptionState = state
        if state.isActive { cancel(category: .scanReset) }
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
        defaults.removeObject(forKey: "brickvalue_trial_reminder_date")
        defer { Task { await reconcileRetention() } }

        guard trialReminderEnabled,
              policy.enabled,
              policy.trialEnding,
              authorizationStatus.canSchedule,
              let expirationDate,
              let request = BrickValNotificationSchedulePlanner.trialEnding(
                expirationDate: expirationDate,
                willRenew: willRenew,
                now: now(),
                timeZone: timeZone,
                locale: Locale(identifier: languageCode)
              )
        else { return }

        do {
            try await center.add(request)
            defaults.set(request.fireDate, forKey: "brickvalue_trial_reminder_date")
            track("notification_scheduled", ["category": "trialEnding"])
            lastError = nil
        } catch {
            lastError = BrickValLocalization.localized("We couldn’t schedule the trial reminder.")
        }
    }

    func cancel(category: BrickValNotificationCategory) {
        defer { if category != .retention { Task { await reconcileRetention() } } }
        center.removePendingNotifications(withIdentifiers: [category.requestIdentifier])
        track("notification_cancelled", ["category": category.rawValue])
        switch category {
        case .retention:
            center.removePendingNotifications(withIdentifiers: ["brickvalue.notification.retention.1", "brickvalue.notification.retention.2"])
            retentionState.reconcileElapsed(now: now())
            retentionState.consent = false
            retentionState.pending = []
            showsRetentionInvitation = false
            persistRetention()
            Task { await reconcileRetention() }
        case .scanReset:
            defaults.removeObject(forKey: "brickvalue_scan_reset_date")
            scanResetReminderEnabled = false
            defaults.set(false, forKey: Keys.scanResetReminder)
        case .trialEnding:
            defaults.removeObject(forKey: "brickvalue_trial_reminder_date")
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
        receiveResponse(url: url, identifier: response.notification.request.identifier)
    }

    private func requestPermission() async -> Bool {
        do {
            let granted = try await center.requestAuthorization()
            await refreshAuthorizationStatus()
            guard granted else {
                lastError = BrickValLocalization.localized("Notifications are off. You can enable them in Settings.")
                return false
            }
            UIApplication.shared.registerForRemoteNotifications()
            lastError = nil
            return true
        } catch {
            lastError = BrickValLocalization.localized("Notifications are unavailable right now.")
            return false
        }
    }

    private func syncDeviceRegistration() {
        guard let apnsToken, let deviceRegistrationHandler else { return }
        let registration = BrickValNotificationDeviceRegistration(
            deviceID: deviceID,
            apnsToken: apnsToken,
            environment: environment,
            languageCode: languageCode,
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
        let identifier = response.notification.request.identifier
        await MainActor.run { [weak self] in
            guard let deepLink, let url = URL(string: deepLink) else { return }
            self?.receiveResponse(url: url, identifier: identifier)
        }
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        let identifier = notification.request.identifier
        await MainActor.run { [weak self] in
            self?.track("notification_foreground_presented", ["notification_id": identifier])
        }
        return [.banner, .sound]
    }

    var retentionAvailable: Bool {
        policy.enabled && policy.retention && retentionState.assignment == .sequence && retentionState.hasSuccessfulScan
    }

    func recordMeaningfulActivity(_ kind: String, hasCollection: Bool, usableScan: Bool = false, accessAllowed: Bool = true) {
        guard accessAllowed else { return }
        retentionState.reconcileElapsed(now: now())
        for pending in retentionState.pending {
            track("notification_cancelled", ["notification_id": pending.identifier, "category": "retention", "reason": "activity"])
        }
        retentionState.lastActivity = now()
        retentionState.hasCollection = hasCollection
        retentionState.episodeSteps = []
        retentionState.pending = []
        if usableScan {
            retentionState.hasSuccessfulScan = true
            if policy.enabled && policy.retention && retentionState.assignment == nil {
                retentionState.assignment = assignRetention()
                retentionState.eligibleAt = now()
                track("notification_experiment_eligible")
            }
            showsRetentionInvitation = retentionAvailable && !retentionState.invitationSeen
        }
        persistRetention()
        track("notification_meaningful_activity", ["activity": kind,
            "after_notification_tap": lastNotificationTap.map { now().timeIntervalSince($0) < 86_400 } ?? false])
        Task { await reconcileRetention() }
    }

    func markRetentionInvitationSeen() {
        guard showsRetentionInvitation else { return }
        retentionState.invitationSeen = true
        persistRetention()
        track("notification_consent_shown")
    }

    func declineRetentionInvitation() {
        showsRetentionInvitation = false
        retentionState.invitationSeen = true
        persistRetention()
        track("notification_consent_declined")
    }

    func requestRetentionReminders() async -> Bool {
        guard retentionAvailable else { return false }
        showsRetentionInvitation = false
        retentionState.invitationSeen = true
        persistRetention()
        guard await requestPermission() else {
            track("notification_consent_denied")
            return false
        }
        retentionState.consent = true
        persistRetention()
        track("notification_consent_enabled")
        await reconcileRetention()
        return lastError == nil
    }

    func updateCollectionPresence(_ hasCollection: Bool) {
        guard retentionState.hasCollection != hasCollection else { return }
        retentionState.hasCollection = hasCollection
        persistRetention()
        Task { await reconcileRetention() }
    }

    /// Serialize notification-center writes: rapid activity cannot leave a stale request behind.
    func reconcileRetention() async {
        let previous = schedulingTask
        let task = Task { @MainActor in
            await previous?.value
            await self.scheduleRetention()
        }
        schedulingTask = task
        await task.value
    }

    private func scheduleRetention() async {
        retentionState.reconcileElapsed(now: now())
        let old = retentionState.pending
        var desired: [RetentionNotificationState.Reservation] = []
        if retentionAvailable && authorizationStatus.canSchedule {
            let utilities = ["brickvalue_scan_reset_date", "brickvalue_trial_reminder_date"]
                .compactMap { defaults.object(forKey: $0) as? Date }
            desired = RetentionNotificationPlanner.reservations(state: retentionState, now: now(), timeZone: timeZone, utilityDates: utilities)
        }
        center.removePendingNotifications(withIdentifiers: ["brickvalue.notification.retention.1", "brickvalue.notification.retention.2"])
        retentionState.pending = []
        for removed in old where !desired.contains(removed) {
            track("notification_cancelled", ["notification_id": removed.identifier, "category": "retention"])
        }
        if !desired.isEmpty { lastError = nil }
        for reservation in desired {
            if reservation.step == 2 && !retentionState.episodeSteps.contains(1) && !retentionState.pending.contains(where: { $0.step == 1 }) { continue }
            do {
                try await center.add(RetentionNotificationPlanner.request(reservation, locale: Locale(identifier: languageCode)))
                retentionState.pending.append(reservation)
                if !old.contains(reservation) {
                    track("notification_scheduled", ["notification_id": reservation.identifier, "category": "retention", "step": reservation.step, "scheduled_at": reservation.date.timeIntervalSince1970])
                }
            } catch {
                lastError = BrickValLocalization.localized("Notifications are unavailable right now.")
                track("notification_schedule_failed", ["category": "retention", "step": reservation.step])
            }
        }
        persistRetention()
    }

    private func persistRetention() {
        if let data = try? JSONEncoder().encode(retentionState) { defaults.set(data, forKey: "brickvalue_retention_state_v1") }
    }

    private func track(_ event: String, _ properties: [String: Any] = [:]) {
        var properties = properties
        properties["retention_assignment"] = retentionState.assignment?.rawValue ?? "unassigned"
        properties["retention_eligible_at"] = retentionState.eligibleAt?.timeIntervalSince1970
        properties["retention_experiment_version"] = 1
        eventHandler?(event, properties)
    }

    func receiveResponse(url: URL, identifier: String) {
        guard url.scheme == "brickval", ["scan", "collection", "settings", "subscription"].contains(url.host ?? "") else { return }
        lastNotificationTap = now()
        track("notification_tapped", ["notification_id": identifier])
        if let responseHandler { responseHandler(url) } else { pendingResponseURL = url }
    }

    private enum Keys {
        static let scanResetReminder = "brickvalue_notification_scan_reset_enabled"
        static let trialReminder = "brickvalue_notification_trial_enabled"
        static let accountAlerts = "brickvalue_notification_account_enabled"
        static let deviceID = "brickvalue_notification_device_id"
    }
}
