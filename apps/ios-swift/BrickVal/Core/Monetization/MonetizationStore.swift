import Foundation
import Observation

@Observable
@MainActor
final class MonetizationStore {
    private(set) var policy: MonetizationPolicy
    private(set) var usage: UsageSnapshot
    private(set) var isSignedIn = false

    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let now: @Sendable () -> Date

    init(
        defaults: UserDefaults = .standard,
        now: @escaping @Sendable () -> Date = Date.init,
        initialPolicy: MonetizationPolicy? = nil
    ) {
        self.defaults = defaults
        self.now = now
        policy = initialPolicy
            ?? Self.decode(MonetizationPolicy.self, from: defaults.data(forKey: Keys.policy))
            ?? .phaseOne
        usage = Self.decode(UsageSnapshot.self, from: defaults.data(forKey: Keys.serverUsage)) ?? .empty()
        applyGuestUsage()
    }

    var collectionLimit: Int { policy.limits.collectionUniqueItems }

    func refresh(using api: BrickValAPIClient, signedIn: Bool) async {
        isSignedIn = signedIn
        do {
            let status = try await api.monetizationStatus()
            policy = status.policy
            save(status.policy, forKey: Keys.policy)
            if signedIn {
                usage = status.usage
                save(status.usage, forKey: Keys.serverUsage)
            } else {
                applyGuestUsage()
            }
        } catch {
            if !signedIn { applyGuestUsage() }
        }
    }

    func configure(signedIn: Bool) {
        guard isSignedIn != signedIn else { return }
        isSignedIn = signedIn
        if !signedIn { applyGuestUsage() }
    }

    func recordSuccessfulSingle(serverUsage: UsageSnapshot?) {
        if isSignedIn, let serverUsage {
            apply(serverUsage)
            return
        }
        guard policy.gates.singleDaily else { return }
        resetGuestSingleIfNeeded()
        defaults.set(defaults.integer(forKey: Keys.guestSingleUsed) + 1, forKey: Keys.guestSingleUsed)
        applyGuestUsage()
    }

    func recordSuccessfulBulk(serverUsage: UsageSnapshot?) {
        if isSignedIn, let serverUsage {
            apply(serverUsage)
            return
        }
        guard policy.gates.bulkRepeat else { return }
        defaults.set(defaults.integer(forKey: Keys.guestBulkUsed) + 1, forKey: Keys.guestBulkUsed)
        applyGuestUsage()
    }

    func applyServerUsage(_ snapshot: UsageSnapshot?) {
        guard let snapshot else { return }
        apply(snapshot)
    }

    func canUseBulk(isPro: Bool) -> Bool {
        !policy.gates.bulkRepeat || isPro || usage.bulkScan.remaining > 0
    }

    func isHistoryLocked(_ horizon: PortfolioHorizon, isPro: Bool) -> Bool {
        policy.gates.marketHistory && horizon != .month && !isPro
    }

    func scanReminder(isPro: Bool) -> String? {
        if isPro { return "Unlimited scans" }
        guard policy.gates.singleDaily else { return nil }
        let remaining = usage.singleScan.remaining
        if remaining == 0 { return "No free scans left today" }
        return "\(remaining) free \(remaining == 1 ? "scan" : "scans") left today"
    }

    private func apply(_ snapshot: UsageSnapshot) {
        usage = snapshot
        save(snapshot, forKey: Keys.serverUsage)
    }

    private func applyGuestUsage() {
        resetGuestSingleIfNeeded()
        let singleUsed = defaults.integer(forKey: Keys.guestSingleUsed)
        let bulkUsed = defaults.integer(forKey: Keys.guestBulkUsed)
        usage = UsageSnapshot(
            isPro: false,
            singleScan: counter(used: singleUsed, limit: policy.limits.singleScansPerDay),
            bulkScan: counter(used: bulkUsed, limit: policy.limits.introductoryBulkScans)
        )
    }

    private func resetGuestSingleIfNeeded() {
        let day = Self.utcDay(now())
        guard defaults.string(forKey: Keys.guestSingleDay) != day else { return }
        defaults.set(day, forKey: Keys.guestSingleDay)
        defaults.set(0, forKey: Keys.guestSingleUsed)
    }

    private func counter(used: Int, limit: Int) -> UsageCounter {
        UsageCounter(
            used: used,
            limit: limit,
            remaining: max(0, limit - used),
            resetsAt: nil
        )
    }

    private func save<T: Encodable>(_ value: T, forKey key: String) {
        if let data = try? JSONEncoder().encode(value) { defaults.set(data, forKey: key) }
    }

    private static func decode<T: Decodable>(_ type: T.Type, from data: Data?) -> T? {
        guard let data else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    private static func utcDay(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    private enum Keys {
        static let policy = "brickvalue_monetization_policy"
        static let serverUsage = "brickvalue_monetization_usage"
        static let guestSingleDay = "brickvalue_guest_single_scan_day"
        static let guestSingleUsed = "brickvalue_guest_single_scans_used"
        static let guestBulkUsed = "brickvalue_guest_bulk_scans_used"
    }
}
