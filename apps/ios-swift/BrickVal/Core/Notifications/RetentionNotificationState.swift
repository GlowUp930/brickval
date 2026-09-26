import Foundation

/// Installation assignment and consent survive identity changes. Activity never crosses accounts.
struct RetentionNotificationState: Codable, Equatable {
    enum Assignment: String, Codable { case sequence, holdout }
    struct Reservation: Codable, Equatable {
        let step: Int
        let date: Date
        let hasCollection: Bool
        var identifier: String { "brickvalue.notification.retention.\(step)" }
    }
    var assignment: Assignment?
    var eligibleAt: Date?
    var invitationSeen = false
    var consent = false
    var hasSuccessfulScan = false
    var hasCollection = false
    var lastActivity: Date?
    var episodeSteps: [Int] = []
    // Elapsed reservations are a conservative frequency budget, not proof of delivery.
    var history: [Date] = []
    var pending: [Reservation] = []
    var identity: String?

    mutating func reconcileElapsed(now: Date) {
        for reservation in pending where reservation.date <= now {
            history.append(reservation.date)
            if !episodeSteps.contains(reservation.step) { episodeSteps.append(reservation.step) }
        }
        pending.removeAll { $0.date <= now }
        history.removeAll { $0 < now.addingTimeInterval(-30 * 86_400) }
    }
}

enum RetentionNotificationPlanner {
    static func reservations(
        state: RetentionNotificationState,
        now: Date,
        timeZone: TimeZone,
        utilityDates: [Date],
        calendar: Calendar = .autoupdatingCurrent
    ) -> [RetentionNotificationState.Reservation] {
        guard state.consent, state.assignment == .sequence,
              state.hasSuccessfulScan, let activity = state.lastActivity else { return [] }
        var calendar = calendar
        calendar.timeZone = timeZone
        var budget = state.history
        var result: [RetentionNotificationState.Reservation] = []
        for (step, days) in [(1, 7), (2, 21)] {
            guard !state.episodeSteps.contains(step),
                  let day = calendar.date(byAdding: .day, value: days, to: activity),
                  let date = calendar.date(bySettingHour: 18, minute: 0, second: 0, of: day) else { continue }
            // Never claim seven complete inactive days if activity happened after 6 PM.
            let fireDate: Date
            if date < day {
                guard let next = calendar.date(byAdding: .day, value: 1, to: date) else { continue }
                fireDate = next
            } else { fireDate = date }
            guard fireDate > now, !utilityDates.contains(where: { abs($0.timeIntervalSince(fireDate)) < 86_400 }),
                  !budget.contains(where: { abs($0.timeIntervalSince(fireDate)) < 7 * 86_400 }),
                  budget.filter({ $0 > fireDate.addingTimeInterval(-30 * 86_400) && $0 <= fireDate }).count < 2
            else { continue }
            // Step two belongs only to episodes with a first reminder reserved or elapsed.
            guard step == 1 || state.episodeSteps.contains(1) || result.contains(where: { $0.step == 1 }) else { continue }
            let reservation = RetentionNotificationState.Reservation(step: step, date: fireDate, hasCollection: state.hasCollection)
            result.append(reservation)
            budget.append(fireDate)
        }
        return result
    }

    static func request(_ reservation: RetentionNotificationState.Reservation, locale: Locale) -> BrickValLocalNotificationRequest {
        let body: LocalizedStringResource
        if reservation.step == 2 {
            body = "Another minifigure to identify? BrickVal is ready when you are."
        } else if reservation.hasCollection {
            body = "Your collection is ready when you are. Review your saved finds or scan another minifigure."
        } else {
            body = "Keep your finds together. Scan a minifigure and save it to your collection."
        }
        return BrickValLocalNotificationRequest(
            identifier: reservation.identifier, category: .retention,
            title: BrickValLocalization.localized("Your next find", locale: locale),
            body: BrickValLocalization.localized(body, locale: locale),
            fireDate: reservation.date,
            deepLink: URL(string: reservation.step == 1 && reservation.hasCollection ? "brickval://collection" : "brickval://scan")!
        )
    }
}
