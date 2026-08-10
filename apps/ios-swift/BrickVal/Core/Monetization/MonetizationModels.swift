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
    case scanLimitWarning = "scan_limit_warning"
    case scanLimitReached = "scan_limit_reached"
    case bulkScanAttempt = "bulk_scan_attempt"
    case collectionLimitWarning = "collection_limit_warning"
    case collectionLimitReached = "collection_limit_reached"
    case marketHistoryAttempt = "market_history_attempt"
    case appearanceAttempt = "appearance_attempt"
}

struct MonetizationPolicy: Codable, Equatable, Sendable {
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

    let version: Int
    let gates: Gates
    let limits: Limits

    static let phaseOne = MonetizationPolicy(
        version: 2,
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
        )
    )
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
