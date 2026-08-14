import Foundation
import Observation

@Observable
@MainActor
final class ProductFeedbackStore {
    private(set) var postPurchaseContext: PostPurchaseContext?
    private(set) var isSubmitting = false
    private(set) var errorMessage: String?
    var presentedSurvey: ProductFeedbackSurvey?

    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let now: @Sendable () -> Date
    @ObservationIgnored private let submitter: @Sendable (ProductFeedbackSubmission) async throws -> Void
    @ObservationIgnored private var lastAccessCohort: String?
    @ObservationIgnored private var latestSuccessfulScanCount = 0

    init(
        api: BrickValAPIClient = .live(),
        defaults: UserDefaults = .standard,
        now: @escaping @Sendable () -> Date = Date.init
    ) {
        self.defaults = defaults
        self.now = now
        self.submitter = api.submitProductFeedback
        postPurchaseContext = nil
        presentedSurvey = nil
    }

    init(
        defaults: UserDefaults,
        now: @escaping @Sendable () -> Date = Date.init,
        submitter: @escaping @Sendable (ProductFeedbackSubmission) async throws -> Void
    ) {
        self.defaults = defaults
        self.now = now
        self.submitter = submitter
        postPurchaseContext = nil
        presentedSurvey = nil
    }

    func preparePostPurchase(context: PostPurchaseContext) {
        guard !handledPostPurchaseIDs.contains(context.id) else { return }
        postPurchaseContext = context
        errorMessage = nil
    }

    func skipPostPurchase() {
        guard let context = postPurchaseContext else { return }
        handledPostPurchaseIDs.insert(context.id)
        persistHandledPostPurchaseIDs()
        postPurchaseContext = nil
        errorMessage = nil
    }

    func submitPostPurchase(
        reasons: Set<PostPurchaseReason>,
        source: AcquisitionSource,
        otherText: String?
    ) async {
        guard let context = postPurchaseContext else { return }
        let orderedReasons = reasons.sorted { $0.rawValue < $1.rawValue }
        guard let primaryReason = orderedReasons.first else { return }
        let submission = makeSubmission(
            surveyType: .postPurchase,
            dedupeKey: "post_purchase_v1:\(context.id)",
            postPurchaseReason: primaryReason,
            postPurchaseReasons: orderedReasons,
            acquisitionSource: source,
            additionalText: normalized(otherText),
            productID: context.productID,
            isTrial: context.isTrial
        )
        await submit(submission) {
            self.handledPostPurchaseIDs.insert(context.id)
            self.persistHandledPostPurchaseIDs()
            self.postPurchaseContext = nil
        }
    }

    func evaluate(
        isPro: Bool,
        subscriptionState: SubscriptionReminderState?,
        successfulScanCount: Int,
        firstSuccessfulScanAt: Date?,
        accessCohort: String?
    ) {
        latestSuccessfulScanCount = successfulScanCount
        lastAccessCohort = accessCohort
        guard presentedSurvey == nil else { return }

        if isPro,
           let subscriptionState,
           subscriptionState.isActive,
           !subscriptionState.willRenew {
            let eventKey = ProductFeedbackEligibility.cancellationEventKey(
                productID: subscriptionState.productID ?? "unknown",
                expirationDate: subscriptionState.expirationDate
            )
            if !handledCancellationEventKeys.contains(eventKey), canShowSurvey() {
                pendingCancellationEventKey = eventKey
                presentedSurvey = .cancellation
                return
            }
        }

        guard postPurchaseContext == nil else { return }

        if ProductFeedbackEligibility.shouldPresentPMF(
            now: now(),
            firstSuccessfulScanAt: firstSuccessfulScanAt,
            successfulScanCount: successfulScanCount,
            lastSurveyAt: lastSurveyAt,
            lastPMFSurveyAt: lastPMFSurveyAt
        ) {
            presentedSurvey = .pmf
        }
    }

    func submitPMF(sentiment: PMFSentiment, benefits: Set<String>, improvements: Set<String>) async {
        let orderedBenefits = benefits.sorted()
        let orderedImprovements = improvements.sorted()
        guard !orderedBenefits.isEmpty, !orderedImprovements.isEmpty else {
            errorMessage = "Please answer both questions before sending."
            return
        }
        let bucket = Int(now().timeIntervalSince1970 / (90 * 24 * 60 * 60))
        let submission = makeSubmission(
            surveyType: .pmf,
            dedupeKey: "pmf_v1:\(bucket)",
            pmfSentiment: sentiment,
            pmfBenefit: orderedBenefits.joined(separator: ", "),
            pmfBenefits: orderedBenefits,
            pmfMissing: orderedImprovements.joined(separator: ", "),
            pmfImprovements: orderedImprovements
        )
        await submit(submission) {
            self.lastPMFSurveyAt = self.now()
            self.markSurveyCompleted()
        }
    }

    func submitCancellation(reasons: Set<CancellationReason>, additionalText: String?) async {
        guard let eventKey = pendingCancellationEventKey else { return }
        let orderedReasons = reasons.sorted { $0.rawValue < $1.rawValue }
        guard let primaryReason = orderedReasons.first else { return }
        let submission = makeSubmission(
            surveyType: .cancellation,
            dedupeKey: eventKey,
            cancellationReason: primaryReason,
            cancellationReasons: orderedReasons,
            additionalText: normalized(additionalText)
        )
        await submit(submission) {
            self.handledCancellationEventKeys.insert(eventKey)
            self.persistHandledCancellationKeys()
            self.pendingCancellationEventKey = nil
            self.markSurveyCompleted()
        }
    }

    func dismissPresentedSurvey() {
        guard let survey = presentedSurvey else { return }
        switch survey {
        case .cancellation:
            if let pendingCancellationEventKey {
                handledCancellationEventKeys.insert(pendingCancellationEventKey)
                persistHandledCancellationKeys()
            }
            pendingCancellationEventKey = nil
        case .pmf:
            lastPMFSurveyAt = now()
        case .postPurchase:
            break
        }
        markSurveyCompleted()
        presentedSurvey = nil
    }

    private func submit(
        _ submission: ProductFeedbackSubmission,
        onSuccess: @escaping @MainActor () -> Void
    ) async {
        isSubmitting = true
        errorMessage = nil
        do {
            try await submitter(submission)
            onSuccess()
            isSubmitting = false
            presentedSurvey = nil
        } catch {
            isSubmitting = false
            errorMessage = "We couldn't send that feedback. Check your connection and try again."
        }
    }

    private func makeSubmission(
        surveyType: ProductFeedbackSurvey,
        dedupeKey: String,
        postPurchaseReason: PostPurchaseReason? = nil,
        postPurchaseReasons: [PostPurchaseReason]? = nil,
        acquisitionSource: AcquisitionSource? = nil,
        pmfSentiment: PMFSentiment? = nil,
        pmfBenefit: String? = nil,
        pmfBenefits: [String]? = nil,
        pmfMissing: String? = nil,
        pmfImprovements: [String]? = nil,
        cancellationReason: CancellationReason? = nil,
        cancellationReasons: [CancellationReason]? = nil,
        additionalText: String? = nil,
        productID: String? = nil,
        isTrial: Bool? = nil
    ) -> ProductFeedbackSubmission {
        ProductFeedbackSubmission(
            surveyType: surveyType,
            dedupeKey: dedupeKey,
            postPurchaseReason: postPurchaseReason,
            postPurchaseReasons: postPurchaseReasons,
            acquisitionSource: acquisitionSource,
            pmfSentiment: pmfSentiment,
            pmfBenefit: pmfBenefit,
            pmfBenefits: pmfBenefits,
            pmfMissing: pmfMissing,
            pmfImprovements: pmfImprovements,
            cancellationReason: cancellationReason,
            cancellationReasons: cancellationReasons,
            additionalText: additionalText,
            accessCohort: lastAccessCohort,
            productID: productID,
            isTrial: isTrial,
            successfulScanCount: latestSuccessfulScanCount,
            appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown",
            appBuild: Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown",
            anonymousID: installationID
        )
    }

    private func canShowSurvey() -> Bool {
        guard let lastSurveyAt else { return true }
        return now().timeIntervalSince(lastSurveyAt) >= 30 * 24 * 60 * 60
    }

    private func markSurveyCompleted() {
        lastSurveyAt = now()
    }

    private func normalized(_ value: String?) -> String? {
        guard let value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : String(trimmed.prefix(1000))
    }

    private var installationID: String {
        if let value = defaults.string(forKey: Keys.installationID) { return value }
        let value = UUID().uuidString
        defaults.set(value, forKey: Keys.installationID)
        return value
    }

    private var lastSurveyAt: Date? {
        get { defaults.object(forKey: Keys.lastSurveyAt) as? Date }
        set { defaults.set(newValue, forKey: Keys.lastSurveyAt) }
    }

    private var lastPMFSurveyAt: Date? {
        get { defaults.object(forKey: Keys.lastPMFSurveyAt) as? Date }
        set { defaults.set(newValue, forKey: Keys.lastPMFSurveyAt) }
    }

    private var handledPostPurchaseIDs: Set<String> {
        get { Set(defaults.stringArray(forKey: Keys.handledPostPurchaseIDs) ?? []) }
        set { defaults.set(Array(newValue), forKey: Keys.handledPostPurchaseIDs) }
    }

    private var handledCancellationEventKeys: Set<String> {
        get { Set(defaults.stringArray(forKey: Keys.handledCancellationEventKeys) ?? []) }
        set { defaults.set(Array(newValue), forKey: Keys.handledCancellationEventKeys) }
    }

    private var pendingCancellationEventKey: String? {
        get { defaults.string(forKey: Keys.pendingCancellationEventKey) }
        set { defaults.set(newValue, forKey: Keys.pendingCancellationEventKey) }
    }

    private func persistHandledPostPurchaseIDs() {
        defaults.set(Array(handledPostPurchaseIDs), forKey: Keys.handledPostPurchaseIDs)
    }

    private func persistHandledCancellationKeys() {
        defaults.set(Array(handledCancellationEventKeys), forKey: Keys.handledCancellationEventKeys)
    }

    private enum Keys {
        static let installationID = "brickvalue_feedback_installation_id"
        static let lastSurveyAt = "brickvalue_feedback_last_survey_at"
        static let lastPMFSurveyAt = "brickvalue_feedback_last_pmf_survey_at"
        static let handledPostPurchaseIDs = "brickvalue_feedback_post_purchase_ids"
        static let handledCancellationEventKeys = "brickvalue_feedback_cancellation_event_keys"
        static let pendingCancellationEventKey = "brickvalue_feedback_pending_cancellation_event_key"
    }
}
