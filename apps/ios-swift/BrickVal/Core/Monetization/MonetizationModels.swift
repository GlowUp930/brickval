import Foundation

enum ProFeature: String, Codable, Sendable {
    case singleScan = "single_scan"
    case bulkScan = "bulk_scan"
    case collectionCapacity = "collection_capacity"
    case marketHistory = "market_history"
    case appearance
}

enum ProPlacement: String, Sendable {
    case subscriptionUpgrade = "brickval_upgrade"
    case onboardingHardAccess = "onboarding_hard_access"
    case scanLimitWarning = "scan_limit_warning"
    case scanLimitReached = "scan_limit_reached"
    case bulkScanAttempt = "bulk_scan_attempt"
    case collectionLimitWarning = "collection_limit_warning"
    case collectionLimitReached = "collection_limit_reached"
    case marketHistoryAttempt = "market_history_attempt"
    case appearanceAttempt = "appearance_attempt"
}

struct MonetizationPolicy: Codable, Equatable, Sendable {
    struct AccessExperiment: Codable, Equatable, Sendable {
        let enabled: Bool
        let hardPaywallPercent: Int
        let trialDays: Int
    }

    struct Gates: Codable, Equatable, Sendable {
        let singleDaily: Bool
        let bulkRepeat: Bool
        let collectionCapacity: Bool
        let marketHistory: Bool
        let appearance: Bool
    }

    struct Limits: Codable, Equatable, Sendable {
        let singleScansPerDay: Int
        let introductoryBulkScans: Int
        let collectionUniqueItems: Int
    }

    struct Notifications: Codable, Equatable, Sendable {
        let enabled: Bool
        let scanReset: Bool
        let trialEnding: Bool
        let accountAction: Bool
    }

    let version: Int
    let accessExperiment: AccessExperiment?
    let gates: Gates
    let limits: Limits
    let notifications: Notifications

    static let phaseOne = MonetizationPolicy(
        version: 3,
        accessExperiment: AccessExperiment(
            enabled: false,
            hardPaywallPercent: 50,
            trialDays: 7
        ),
        gates: Gates(
            singleDaily: true,
            bulkRepeat: true,
            collectionCapacity: true,
            marketHistory: false,
            appearance: true
        ),
        limits: Limits(
            singleScansPerDay: 3,
            introductoryBulkScans: 1,
            collectionUniqueItems: 10
        ),
        notifications: Notifications(
            enabled: true,
            scanReset: true,
            trialEnding: true,
            accountAction: true
        )
    )

    var effectiveAccessExperiment: AccessExperiment {
        accessExperiment ?? AccessExperiment(
            enabled: false,
            hardPaywallPercent: 0,
            trialDays: 7
        )
    }
}

enum MonetizationAccessCohort: String, Codable, Equatable, Sendable {
    case legacySoft = "legacy_soft"
    case experimentSoft = "experiment_soft"
    case hardTrial = "hard_trial"
}

struct UsageCounter: Codable, Equatable, Sendable {
    let used: Int
    let limit: Int
    let remaining: Int
    let resetsAt: String?
}

struct UsageSnapshot: Codable, Equatable, Sendable {
    let isPro: Bool
    let singleScan: UsageCounter
    let bulkScan: UsageCounter

    static func empty(policy: MonetizationPolicy = .phaseOne, isPro: Bool = false) -> UsageSnapshot {
        UsageSnapshot(
            isPro: isPro,
            singleScan: UsageCounter(
                used: 0,
                limit: policy.limits.singleScansPerDay,
                remaining: policy.limits.singleScansPerDay,
                resetsAt: nil
            ),
            bulkScan: UsageCounter(
                used: 0,
                limit: policy.limits.introductoryBulkScans,
                remaining: policy.limits.introductoryBulkScans,
                resetsAt: nil
            )
        )
    }
}

struct MonetizationStatus: Codable, Equatable, Sendable {
    let policy: MonetizationPolicy
    let usage: UsageSnapshot
}

struct BulkMinifigLookupResult: Sendable {
    let rows: [BulkMinifigLookupRow]
    let usage: UsageSnapshot?
}

enum BulkLookupSource: String, Encodable, Sendable {
    case bulkScan = "bulk-scan"
    case review
}
