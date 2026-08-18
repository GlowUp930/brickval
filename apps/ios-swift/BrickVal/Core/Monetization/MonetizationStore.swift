import Foundation
import Observation

@Observable
@MainActor
final class MonetizationStore {
    private(set) var policy: MonetizationPolicy
    private(set) var usage: UsageSnapshot
    private(set) var isSignedIn = false
    private(set) var accessCohort: MonetizationAccessCohort?
    private(set) var experimentSeed: Int?
    private(set) var successfulSingleScanCount: Int
    private(set) var firstSuccessfulSingleScanAt: Date?

    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let now: @Sendable () -> Date
    @ObservationIgnored private let experimentRoll: @Sendable () -> Int

    init(
        defaults: UserDefaults = .standard,
        now: @escaping @Sendable () -> Date = Date.init,
        experimentRoll: @escaping @Sendable () -> Int = { Int.random(in: 0..<100) },
        initialPolicy: MonetizationPolicy? = nil
    ) {
        self.defaults = defaults
        self.now = now
        self.experimentRoll = experimentRoll
        let cachedPolicy = Self.decode(MonetizationPolicy.self, from: defaults.data(forKey: Keys.policy))
        policy = initialPolicy
            ?? Self.currentPolicy(from: cachedPolicy)
        usage = Self.decode(UsageSnapshot.self, from: defaults.data(forKey: Keys.serverUsage)) ?? .empty()
        accessCohort = defaults.string(forKey: Keys.accessCohort)
            .flatMap(MonetizationAccessCohort.init(rawValue:))
        experimentSeed = defaults.object(forKey: Keys.experimentSeed) as? Int
        successfulSingleScanCount = defaults.integer(forKey: Keys.successfulSingleScanCount)
        firstSuccessfulSingleScanAt = defaults.object(forKey: Keys.firstSuccessfulSingleScanAt) as? Date
#if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-showHardAccessDemo") {
            accessCohort = .hardTrial
        }
#endif
        protectExistingUserIfNeeded(
            hasCompletedOnboarding: defaults.bool(forKey: Keys.onboardingCompleted)
        )
        applyGuestUsage()
    }

    var collectionLimit: Int { policy.limits.collectionUniqueItems }

    var offerCodesEnabled: Bool { policy.gates.offerCodes }

    var trialDays: Int { policy.effectiveAccessExperiment.trialDays }

    func protectExistingUserIfNeeded(hasCompletedOnboarding: Bool) {
        guard accessCohort == nil, hasCompletedOnboarding else { return }
        setAccessCohort(.legacySoft)
    }

    func enrollNewUserIfNeeded(seed: Int? = nil) {
        guard accessCohort == nil else { return }
        let experiment = policy.effectiveAccessExperiment
        let roll = min(max(seed ?? experimentSeed ?? experimentRoll(), 0), 99)
        experimentSeed = roll
        defaults.set(roll, forKey: Keys.experimentSeed)
        let cohort: MonetizationAccessCohort = experiment.enabled && roll < experiment.hardPaywallPercent
            ? .hardTrial
            : .experimentSoft
        setAccessCohort(cohort)
    }

    func requiresProForApp(isPro: Bool) -> Bool {
#if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-showHardAccessDemo") {
            return !isPro
        }
#endif
        return policy.effectiveAccessExperiment.enabled && accessCohort == .hardTrial && !isPro
    }

    func requiresProForScanning(isPro: Bool) -> Bool {
        requiresProForApp(isPro: isPro)
    }

    var shouldPresentHardAccessIntro: Bool {
        accessCohort == .hardTrial && !defaults.bool(forKey: Keys.hardAccessIntroPresented)
    }

    var shouldPresentSoftAccessIntro: Bool {
        accessCohort == .experimentSoft && !defaults.bool(forKey: Keys.softAccessIntroPresented)
    }

    func markHardAccessIntroPresented() {
        defaults.set(true, forKey: Keys.hardAccessIntroPresented)
    }

    func markSoftAccessIntroPresented() {
        defaults.set(true, forKey: Keys.softAccessIntroPresented)
    }

    func refresh(using api: BrickValAPIClient, signedIn: Bool) async {
        isSignedIn = signedIn
        do {
            let status = try await api.monetizationStatus()
            let currentPolicy = Self.currentPolicy(from: status.policy)
            policy = currentPolicy
            save(currentPolicy, forKey: Keys.policy)
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
        if firstSuccessfulSingleScanAt == nil {
            firstSuccessfulSingleScanAt = now()
            defaults.set(firstSuccessfulSingleScanAt, forKey: Keys.firstSuccessfulSingleScanAt)
        }
        successfulSingleScanCount += 1
        defaults.set(successfulSingleScanCount, forKey: Keys.successfulSingleScanCount)
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

    func canUseSingle(isPro: Bool) -> Bool {
        !policy.gates.singleDaily || isPro || usage.singleScan.remaining > 0
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
            singleScan: counter(
                used: singleUsed,
                limit: policy.limits.singleScansPerDay,
                resetsAt: iso8601String(nextUTCDate(after: now()))
            ),
            bulkScan: counter(
                used: bulkUsed,
                limit: policy.limits.introductoryBulkScans,
                resetsAt: nil
            )
        )
    }

    private func resetGuestSingleIfNeeded() {
        let day = Self.utcDay(now())
        guard defaults.string(forKey: Keys.guestSingleDay) != day else { return }
        defaults.set(day, forKey: Keys.guestSingleDay)
        defaults.set(0, forKey: Keys.guestSingleUsed)
    }

    private func counter(used: Int, limit: Int, resetsAt: String?) -> UsageCounter {
        UsageCounter(
            used: used,
            limit: limit,
            remaining: max(0, limit - used),
            resetsAt: resetsAt
        )
    }

    private func nextUTCDate(after date: Date) -> Date {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        let startOfDay = calendar.startOfDay(for: date)
        return calendar.date(byAdding: .day, value: 1, to: startOfDay) ?? date.addingTimeInterval(24 * 60 * 60)
    }

    private func iso8601String(_ date: Date) -> String {
        ISO8601DateFormatter().string(from: date)
    }

    private func save<T: Encodable>(_ value: T, forKey key: String) {
        if let data = try? JSONEncoder().encode(value) { defaults.set(data, forKey: key) }
    }

    private func setAccessCohort(_ cohort: MonetizationAccessCohort) {
        accessCohort = cohort
        defaults.set(cohort.rawValue, forKey: Keys.accessCohort)
    }

    private static func decode<T: Decodable>(_ type: T.Type, from data: Data?) -> T? {
        guard let data else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    private static func currentPolicy(from cachedPolicy: MonetizationPolicy?) -> MonetizationPolicy {
        guard let cachedPolicy, cachedPolicy.version >= MonetizationPolicy.phaseOne.version else {
            return .phaseOne
        }
        return cachedPolicy
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
        static let onboardingCompleted = "has_completed_onboarding"
        static let accessCohort = "brickvalue_monetization_access_cohort"
        static let experimentSeed = "brickvalue_monetization_experiment_seed"
        static let hardAccessIntroPresented = "brickvalue_hard_access_intro_presented"
        static let softAccessIntroPresented = "brickvalue_soft_access_intro_presented"
        static let successfulSingleScanCount = "brickvalue_successful_single_scan_count"
        static let firstSuccessfulSingleScanAt = "brickvalue_first_successful_single_scan_at"
    }
}
