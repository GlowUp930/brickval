import Foundation

/// Installation assignment, invitation history and frequency budget survive account changes.
struct RetentionNotificationState: Codable, Equatable {
    static let storageKey = "brickvalue_retention_state_v2"
    enum Assignment: String, Codable { case sequence, holdout }
    struct Reservation: Codable, Equatable {
        let step: Int
        let date: Date
        let hasCollection: Bool // Kept for decoding legacy reservations.
        var copyVariant: String? = nil
        var identifier: String { "brickvalue.notification.retention.\(step)" }
    }
    var assignment: Assignment?
    var eligibleAt: Date?
    var invitationSeen = false
    var consent = false
    var hasSuccessfulScan = false
    var hasCollection = false
    var lastActivity: Date?
    var episodeSteps: [Int] = [] // Elapsed or permanently skipped campaign steps.
    var history: [Date] = [] // Reservations are not delivery receipts.
    var pending: [Reservation] = []
    var identity: String?
    // Optional fields allow decoding the previous schema without discarding history.
    var campaignEligibleAt: Date? = nil
    var campaignVersion: Int? = nil
    var consentAt: Date? = nil
    var campaignCancelled: Bool? = nil
    var recognitionFailed: Bool? = nil

    static func load(defaults: UserDefaults, now: Date) -> Self {
        if let data = defaults.data(forKey: storageKey),
           let state = try? JSONDecoder().decode(Self.self, from: data) { return state }
        guard let data = defaults.data(forKey: "brickvalue_retention_state_v1"),
              var legacy = try? JSONDecoder().decode(Self.self, from: data) else {
            var fresh = Self(); fresh.campaignVersion = 2; return fresh
        }
        legacy.reconcileElapsed(now: now)
        legacy.pending = []
        legacy.episodeSteps = []
        legacy.consent = false // The higher frequency needs explicit fresh consent in Settings.
        legacy.consentAt = nil
        legacy.campaignVersion = 2
        return legacy
    }

    mutating func reconcileElapsed(now: Date) {
        for reservation in pending where reservation.date <= now {
            if !history.contains(reservation.date) { history.append(reservation.date) }
            if !episodeSteps.contains(reservation.step) { episodeSteps.append(reservation.step) }
        }
        pending.removeAll { $0.date <= now }
        history.removeAll { $0 < now.addingTimeInterval(-30 * 86_400) }
    }
}

enum RetentionNotificationPlanner {
    static let identifiers = (1...3).map { "brickvalue.notification.retention.\($0)" }

    /// Dates remain anchored to first consent. Time-zone changes may adjust the local hour.
    static func milestones(state: RetentionNotificationState, timeZone: TimeZone,
                           calendar: Calendar = .autoupdatingCurrent) -> [RetentionNotificationState.Reservation] {
        guard let consent = state.consentAt else { return [] }
        var calendar = calendar
        calendar.timeZone = timeZone
        return [(1, 1), (2, 3), (3, 7)].compactMap { step, days in
            let earliest = consent.addingTimeInterval(Double(days) * 86_400)
            guard let evening = calendar.date(bySettingHour: 18, minute: 0, second: 0, of: earliest) else { return nil }
            let date: Date
            if evening < earliest {
                guard let next = calendar.date(byAdding: .day, value: 1, to: evening) else { return nil }
                date = next
            } else { date = evening }
            let variant: String
            if step == 1 && state.recognitionFailed == true { variant = "recognition_retry" }
            else { variant = state.hasSuccessfulScan ? "repeat_scan" : "first_scan" }
            return .init(step: step, date: date, hasCollection: state.hasCollection, copyVariant: variant)
        }
    }

    static func reservations(state: RetentionNotificationState, now: Date, timeZone: TimeZone,
                             utilityDates: [Date], calendar: Calendar = .autoupdatingCurrent)
        -> [RetentionNotificationState.Reservation] {
        guard state.consent, state.assignment == .sequence, state.campaignCancelled != true else { return [] }
        var budget = state.history
        var result: [RetentionNotificationState.Reservation] = []
        for reservation in milestones(state: state, timeZone: timeZone, calendar: calendar) {
            let date = reservation.date
            guard !state.episodeSteps.contains(reservation.step), date > now,
                  !utilityDates.contains(where: { abs($0.timeIntervalSince(date)) < 86_400 }),
                  !(state.lastActivity.map { $0 <= date && date.timeIntervalSince($0) < 86_400 } ?? false),
                  !budget.contains(where: { abs($0.timeIntervalSince(date)) < 48 * 3_600 }),
                  budget.filter({ $0 > date.addingTimeInterval(-30 * 86_400) && $0 <= date }).count < 3
            else { continue }
            result.append(reservation)
            budget.append(date)
        }
        return result
    }

    static func request(_ reservation: RetentionNotificationState.Reservation, locale: Locale) -> BrickValLocalNotificationRequest {
        let title: LocalizedStringResource
        let body: LocalizedStringResource
        switch (reservation.step, reservation.copyVariant ?? "first_scan") {
        case (1, "recognition_retry"):
            title = "Try one figure at a time"
            body = "Separate one minifigure from the pile and try again in good light."
        case (1, "repeat_scan"):
            title = "What’s your next find?"
            body = "Scan another minifigure and see what you discover."
        case (2, "repeat_scan"):
            title = "A few figures to identify?"
            body = "Try Bulk Scan to identify several minifigures in one photo. Pro may be required."
        case (3, "repeat_scan"):
            title = "One more find this week?"
            body = "Pick another minifigure and scan it with BrickVal."
        case (2, _):
            title = "Start with just one figure"
            body = "One minifigure, good light, one photo. Open BrickVal and try your first scan."
        case (3, _):
            title = "Have a minifigure nearby?"
            body = "Open BrickVal and try scanning it when you have a moment."
        default:
            title = "Meet your first minifigure"
            body = "Place one minifigure in good light and scan it to identify it."
        }
        let mode = reservation.step == 2 && reservation.copyVariant == "repeat_scan" ? "bulk" : "single"
        return .init(identifier: reservation.identifier, category: .retention,
                     title: BrickValLocalization.localized(title, locale: locale),
                     body: BrickValLocalization.localized(body, locale: locale), fireDate: reservation.date,
                     deepLink: URL(string: "brickval://scan?mode=\(mode)&campaign=2&step=\(reservation.step)&variant=\(reservation.copyVariant ?? "first_scan")")!)
    }
}
