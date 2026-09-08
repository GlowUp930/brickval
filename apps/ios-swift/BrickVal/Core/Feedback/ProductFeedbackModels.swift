import Foundation

enum ProductFeedbackSurvey: String, Codable, Equatable, Identifiable, Sendable {
    case cancellation
    case postPurchase = "post_purchase"
    case pmf

    var id: String { rawValue }
}

enum PostPurchaseReason: String, CaseIterable, Codable, Equatable, Hashable, Sendable {
    case unlimitedScans = "unlimited_scans"
    case bulkScanning = "bulk_scanning"
    case collectionTracking = "collection_tracking"
    case valuesHistory = "values_history"
    case customization
    case supportingBrickValue = "supporting_brickvalue"
    case other

    var displayTitle: String {
        switch self {
        case .unlimitedScans: BrickValLocalization.localized("Unlimited scans")
        case .bulkScanning: BrickValLocalization.localized("Bulk scanning")
        case .collectionTracking: BrickValLocalization.localized("Collection tracking")
        case .valuesHistory: BrickValLocalization.localized("LEGO values and history")
        case .customization: BrickValLocalization.localized("Customization")
        case .supportingBrickValue: BrickValLocalization.localized("Supporting BrickValue")
        case .other: BrickValLocalization.localized("Other")
        }
    }
}

enum AcquisitionSource: String, CaseIterable, Codable, Equatable, Hashable, Sendable {
    case tiktok
    case instagram
    case youtube
    case appStoreSearch = "app_store_search"
    case webSearch = "web_search"
    case friendCommunity = "friend_community"
    case other

    var displayTitle: String {
        switch self {
        case .tiktok: BrickValLocalization.localized("TikTok")
        case .instagram: BrickValLocalization.localized("Instagram")
        case .youtube: BrickValLocalization.localized("YouTube")
        case .appStoreSearch: BrickValLocalization.localized("App Store search")
        case .webSearch: BrickValLocalization.localized("Google or web search")
        case .friendCommunity: BrickValLocalization.localized("Friend or LEGO community")
        case .other: BrickValLocalization.localized("Other")
        }
    }
}

enum PMFSentiment: String, CaseIterable, Codable, Equatable, Hashable, Sendable {
    case veryDisappointed = "very_disappointed"
    case somewhatDisappointed = "somewhat_disappointed"
    case notDisappointed = "not_disappointed"
    case noLongerUse = "no_longer_use"

    var displayTitle: String {
        switch self {
        case .veryDisappointed: BrickValLocalization.localized("Very disappointed")
        case .somewhatDisappointed: BrickValLocalization.localized("Somewhat disappointed")
        case .notDisappointed: BrickValLocalization.localized("Not disappointed")
        case .noLongerUse: BrickValLocalization.localized("I no longer use it")
        }
    }
}

enum CancellationReason: String, CaseIterable, Codable, Equatable, Hashable, Sendable {
    case price
    case scanAccuracy = "scan_accuracy"
    case scanSpeed = "scan_speed"
    case notEnoughUse = "not_enough_use"
    case missingFeature = "missing_feature"
    case technicalProblem = "technical_problem"
    case temporaryNeed = "temporary_need"
    case other

    var displayTitle: String {
        switch self {
        case .price: BrickValLocalization.localized("Price")
        case .scanAccuracy: BrickValLocalization.localized("Scan accuracy")
        case .scanSpeed: BrickValLocalization.localized("Scan speed")
        case .notEnoughUse: BrickValLocalization.localized("I do not use it enough")
        case .missingFeature: BrickValLocalization.localized("Missing feature")
        case .technicalProblem: BrickValLocalization.localized("Technical problem")
        case .temporaryNeed: BrickValLocalization.localized("I only needed it temporarily")
        case .other: BrickValLocalization.localized("Other")
        }
    }
}

struct PostPurchaseContext: Codable, Equatable, Identifiable, Sendable {
    let productID: String
    let isTrial: Bool

    var id: String { "\(productID):\(isTrial)" }
}

struct ProductFeedbackSubmission: Codable, Equatable, Sendable {
    let surveyType: ProductFeedbackSurvey
    let dedupeKey: String
    let postPurchaseReason: PostPurchaseReason?
    let postPurchaseReasons: [PostPurchaseReason]?
    let acquisitionSource: AcquisitionSource?
    let pmfSentiment: PMFSentiment?
    let pmfBenefit: String?
    let pmfBenefits: [String]?
    let pmfMissing: String?
    let pmfImprovements: [String]?
    let cancellationReason: CancellationReason?
    let cancellationReasons: [CancellationReason]?
    let additionalText: String?
    let accessCohort: String?
    let productID: String?
    let isTrial: Bool?
    let successfulScanCount: Int
    let appVersion: String
    let appBuild: String
    let anonymousID: String
}

enum ProductFeedbackEligibility {
    static func shouldPresentPMF(
        now: Date,
        firstSuccessfulScanAt: Date?,
        successfulScanCount: Int,
        lastSurveyAt: Date?,
        lastPMFSurveyAt: Date?
    ) -> Bool {
        guard successfulScanCount >= 5,
              let firstSuccessfulScanAt,
              now.timeIntervalSince(firstSuccessfulScanAt) >= 7 * 24 * 60 * 60 else {
            return false
        }
        if let lastSurveyAt, now.timeIntervalSince(lastSurveyAt) < 30 * 24 * 60 * 60 {
            return false
        }
        if let lastPMFSurveyAt, now.timeIntervalSince(lastPMFSurveyAt) < 90 * 24 * 60 * 60 {
            return false
        }
        return true
    }

    static func cancellationEventKey(productID: String, expirationDate: Date?) -> String {
        let expiration = expirationDate.map { String(format: "%.0f", $0.timeIntervalSince1970) } ?? "unknown"
        return "cancellation_v1:\(productID):\(expiration)"
    }
}
