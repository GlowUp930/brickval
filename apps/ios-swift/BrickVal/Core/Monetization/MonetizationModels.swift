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
        let offerCodes: Bool
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
    let lockedBulkPreview: Bool
    let notifications: Notifications
    let minimumAppBuild: Int?
    let appUpdateURL: URL?

    init(
        version: Int,
        accessExperiment: AccessExperiment?,
        gates: Gates,
        limits: Limits,
        lockedBulkPreview: Bool = false,
        notifications: Notifications,
        minimumAppBuild: Int? = nil,
        appUpdateURL: URL? = nil
    ) {
        self.version = version
        self.accessExperiment = accessExperiment
        self.gates = gates
        self.limits = limits
        self.lockedBulkPreview = lockedBulkPreview
        self.notifications = notifications
        self.minimumAppBuild = minimumAppBuild
        self.appUpdateURL = appUpdateURL
    }

    static let phaseOne = MonetizationPolicy(
        version: 6,
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
            appearance: true,
            offerCodes: true
        ),
        limits: Limits(
            singleScansPerDay: 3,
            introductoryBulkScans: 1,
            collectionUniqueItems: 10
        ),
        lockedBulkPreview: true,
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

    private enum CodingKeys: String, CodingKey {
        case version
        case accessExperiment
        case gates
        case limits
        case lockedBulkPreview
        case notifications
        case minimumAppBuild
        case appUpdateURL
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        version = try container.decode(Int.self, forKey: .version)
        accessExperiment = try container.decodeIfPresent(AccessExperiment.self, forKey: .accessExperiment)
        gates = try container.decode(Gates.self, forKey: .gates)
        limits = try container.decode(Limits.self, forKey: .limits)
        lockedBulkPreview = try container.decodeIfPresent(Bool.self, forKey: .lockedBulkPreview) ?? false
        notifications = try container.decode(Notifications.self, forKey: .notifications)
        minimumAppBuild = try container.decodeIfPresent(Int.self, forKey: .minimumAppBuild)
        appUpdateURL = try container.decodeIfPresent(URL.self, forKey: .appUpdateURL)
    }
}

extension MonetizationPolicy.Gates {
    private enum CodingKeys: String, CodingKey {
        case singleDaily
        case bulkRepeat
        case collectionCapacity
        case marketHistory
        case appearance
        case offerCodes
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        singleDaily = try container.decode(Bool.self, forKey: .singleDaily)
        bulkRepeat = try container.decode(Bool.self, forKey: .bulkRepeat)
        collectionCapacity = try container.decode(Bool.self, forKey: .collectionCapacity)
        marketHistory = try container.decode(Bool.self, forKey: .marketHistory)
        appearance = try container.decode(Bool.self, forKey: .appearance)
        offerCodes = try container.decodeIfPresent(Bool.self, forKey: .offerCodes) ?? true
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

struct ReferralStatus: Codable, Equatable, Sendable {
    let code: String
    let qualifiedCount: Int
    let goal: Int
    let bonusBulkScans: Int
    let bulkCreditsRemaining: Int
    let rewardGranted: Bool
}

struct ReferralClaimResponse: Codable, Sendable {
    let claimed: Bool
    let status: String
    let referral: ReferralStatus
}

struct ReferralOnboardingCompletionResponse: Codable, Sendable {
    let qualified: Bool
    let rewardGranted: Bool
    let referral: ReferralStatus
}

struct BulkMinifigLookupResult: Sendable {
    let rows: [BulkMinifigLookupRow]
    let usage: UsageSnapshot?
}

enum BulkLookupSource: String, Encodable, Sendable {
    case bulkScan = "bulk-scan"
    case review
}
