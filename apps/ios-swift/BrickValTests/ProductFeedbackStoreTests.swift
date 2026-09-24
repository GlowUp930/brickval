import Foundation
import Testing
@testable import BrickVal

@MainActor
struct ProductFeedbackStoreTests {
    @Test
    func freshPurchaseDoesNotShowCancellationSurvey() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let defaults = UserDefaults(suiteName: "ProductFeedbackStoreTests.\(UUID().uuidString)")!
        let store = ProductFeedbackStore(defaults: defaults, now: { now }, submitter: { _ in })
        let productID = "com.brickval.app.pro.monthly"
        store.preparePostPurchase(context: PostPurchaseContext(productID: productID, isTrial: false))

        store.evaluate(
            isPro: true,
            subscriptionState: SubscriptionReminderState(
                isActive: true,
                isTrial: false,
                willRenew: false,
                expirationDate: now.addingTimeInterval(30 * 86_400),
                productID: productID
            ),
            successfulScanCount: 0,
            firstSuccessfulScanAt: nil,
            accessCohort: "experiment_soft"
        )

        #expect(store.presentedSurvey == nil)
    }

    @Test
    func nonRenewingSubscriptionWithoutUnsubscribeEventDoesNotShowCancellationSurvey() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let defaults = UserDefaults(suiteName: "ProductFeedbackStoreTests.\(UUID().uuidString)")!
        let store = ProductFeedbackStore(defaults: defaults, now: { now }, submitter: { _ in })

        store.evaluate(
            isPro: true,
            subscriptionState: SubscriptionReminderState(
                isActive: true,
                isTrial: false,
                willRenew: false,
                expirationDate: now.addingTimeInterval(30 * 86_400),
                productID: "com.brickval.app.pro.monthly"
            ),
            successfulScanCount: 0,
            firstSuccessfulScanAt: nil,
            accessCohort: nil
        )

        #expect(store.presentedSurvey == nil)
    }

    @Test
    func freshPurchaseDefersRealCancellationUntilAfterSurveyCooldown() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let defaults = UserDefaults(suiteName: "ProductFeedbackStoreTests.\(UUID().uuidString)")!
        let store = ProductFeedbackStore(defaults: defaults, now: { now }, submitter: { _ in })
        let productID = "com.brickval.app.pro.monthly"
        let subscription = SubscriptionReminderState(
            isActive: true,
            isTrial: false,
            willRenew: false,
            unsubscribeDetectedAt: now,
            expirationDate: now.addingTimeInterval(30 * 86_400),
            productID: productID
        )
        store.preparePostPurchase(context: PostPurchaseContext(productID: productID, isTrial: false))

        store.evaluate(
            isPro: true, subscriptionState: subscription,
            successfulScanCount: 0, firstSuccessfulScanAt: nil, accessCohort: nil
        )
        #expect(store.presentedSurvey == nil)

        store.skipPostPurchase()
        store.evaluate(
            isPro: true, subscriptionState: subscription,
            successfulScanCount: 0, firstSuccessfulScanAt: nil, accessCohort: nil
        )
        #expect(store.presentedSurvey == nil)

        let later = ProductFeedbackStore(
            defaults: defaults, now: { now.addingTimeInterval(31 * 86_400) }, submitter: { _ in }
        )
        later.evaluate(
            isPro: true, subscriptionState: subscription,
            successfulScanCount: 0, firstSuccessfulScanAt: nil, accessCohort: nil
        )
        #expect(later.presentedSurvey == .cancellation)
    }

    @Test
    func cancellationHasPriorityAndDismissalIsRemembered() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let defaults = UserDefaults(suiteName: "ProductFeedbackStoreTests.\(UUID().uuidString)")!
        let store = ProductFeedbackStore(
            defaults: defaults,
            now: { now },
            submitter: { _ in }
        )
        let subscription = SubscriptionReminderState(
            isActive: true,
            isTrial: false,
            willRenew: false,
            unsubscribeDetectedAt: now,
            expirationDate: now.addingTimeInterval(86_400),
            productID: "com.brickval.app.pro.monthly"
        )

        store.evaluate(
            isPro: true,
            subscriptionState: subscription,
            successfulScanCount: 5,
            firstSuccessfulScanAt: now.addingTimeInterval(-8 * 86_400),
            accessCohort: "experiment_soft"
        )

        #expect(store.presentedSurvey == .cancellation)
        store.dismissPresentedSurvey()
        #expect(store.presentedSurvey == nil)

        store.evaluate(
            isPro: true,
            subscriptionState: subscription,
            successfulScanCount: 5,
            firstSuccessfulScanAt: now.addingTimeInterval(-8 * 86_400),
            accessCohort: "experiment_soft"
        )
        #expect(store.presentedSurvey == nil)
    }

    @Test
    func postPurchaseCanBeSkippedOnlyOncePerPlanContext() {
        let defaults = UserDefaults(suiteName: "ProductFeedbackStoreTests.\(UUID().uuidString)")!
        let store = ProductFeedbackStore(defaults: defaults, submitter: { _ in })
        let context = PostPurchaseContext(productID: "com.brickval.app.pro.yearly", isTrial: true)

        store.preparePostPurchase(context: context)
        #expect(store.postPurchaseContext == context)
        store.skipPostPurchase()
        #expect(store.postPurchaseContext == nil)

        store.preparePostPurchase(context: context)
        #expect(store.postPurchaseContext == nil)
    }
}
