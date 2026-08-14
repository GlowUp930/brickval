import Foundation
import Testing
@testable import BrickVal

@MainActor
struct MonetizationStoreTests {
    @Test func olderCachedPolicyFallsBackToCurrentBundledPolicy() throws {
        let context = context()
        let oldPolicy = policy(singleDaily: false)
        context.defaults.set(
            try JSONEncoder().encode(oldPolicy),
            forKey: "brickvalue_monetization_policy"
        )

        let store = MonetizationStore(defaults: context.defaults)

        #expect(store.policy.version == 3)
        #expect(store.policy.gates.singleDaily)
        #expect(store.scanReminder(isPro: false) == "3 free scans left today")
    }

    @Test func currentPolicyShowsDailyScanAllowance() {
        let context = context()
        let store = MonetizationStore(defaults: context.defaults)

        store.recordSuccessfulSingle(serverUsage: nil)

        #expect(store.scanReminder(isPro: false) == "2 free scans left today")
        #expect(store.usage.singleScan.remaining == 2)
        #expect(store.canUseSingle(isPro: false))
        #expect(store.canUseSingle(isPro: true))
    }

    @Test func dailyReminderUpdatesOnlyAfterSuccessfulScans() {
        let context = context()
        let store = MonetizationStore(
            defaults: context.defaults,
            now: { Date(timeIntervalSince1970: 1_786_291_200) },
            initialPolicy: policy(singleDaily: true)
        )

        #expect(store.scanReminder(isPro: false) == "3 free scans left today")
        store.recordSuccessfulSingle(serverUsage: nil)
        #expect(store.scanReminder(isPro: false) == "2 free scans left today")
        store.recordSuccessfulSingle(serverUsage: nil)
        #expect(store.scanReminder(isPro: false) == "1 free scan left today")
        store.recordSuccessfulSingle(serverUsage: nil)
        #expect(store.scanReminder(isPro: false) == "No free scans left today")
        #expect(store.canUseSingle(isPro: false) == false)
        #expect(store.canUseSingle(isPro: true))
        #expect(store.scanReminder(isPro: true) == "Unlimited scans")
    }

    @Test func anonymousDailyAllowanceResetsOnTheNextUtcDay() {
        let context = context()
        let firstDay = Date(timeIntervalSince1970: 1_786_291_200)
        let firstStore = MonetizationStore(
            defaults: context.defaults,
            now: { firstDay },
            initialPolicy: policy(singleDaily: true)
        )
        firstStore.recordSuccessfulSingle(serverUsage: nil)
        #expect(firstStore.usage.singleScan.remaining == 2)

        let secondDay = firstDay.addingTimeInterval(86_400)
        let secondStore = MonetizationStore(
            defaults: context.defaults,
            now: { secondDay },
            initialPolicy: policy(singleDaily: true)
        )

        #expect(secondStore.usage.singleScan.remaining == 3)
    }

    @Test func anonymousBulkAllowanceIsConsumedOnceAfterSuccess() {
        let context = context()
        let store = MonetizationStore(defaults: context.defaults)

        #expect(store.canUseBulk(isPro: false))
        store.recordSuccessfulBulk(serverUsage: nil)
        #expect(store.canUseBulk(isPro: false) == false)
        #expect(store.canUseBulk(isPro: true))
    }

    @Test func completedExistingUserIsGrandfatheredIntoSoftAccess() {
        let context = context()
        context.defaults.set(true, forKey: "has_completed_onboarding")

        let store = MonetizationStore(
            defaults: context.defaults,
            experimentRoll: { 0 }
        )

        #expect(store.accessCohort == .legacySoft)
        #expect(store.requiresProForApp(isPro: false) == false)
    }

    @Test func newUserIsAssignedToHardTrialCohortWithinRollout() {
        let context = context()
        let store = MonetizationStore(
            defaults: context.defaults,
            experimentRoll: { 49 },
            initialPolicy: policy(singleDaily: true, hardPaywallEnabled: true)
        )

        store.enrollNewUserIfNeeded()

        #expect(store.accessCohort == .hardTrial)
        #expect(store.requiresProForApp(isPro: false))
        #expect(store.requiresProForApp(isPro: true) == false)
        #expect(store.trialDays == 7)
    }

    @Test func newUserIsAssignedToSoftControlOutsideRollout() {
        let context = context()
        let store = MonetizationStore(
            defaults: context.defaults,
            experimentRoll: { 50 },
            initialPolicy: policy(singleDaily: true, hardPaywallEnabled: true)
        )

        store.enrollNewUserIfNeeded()

        #expect(store.accessCohort == .experimentSoft)
        #expect(store.requiresProForApp(isPro: false) == false)
    }

    @Test(arguments: [0, 49])
    func hardAccessUsesTheFirstHalfOfTheRollout(roll: Int) {
        let context = context()
        let store = MonetizationStore(
            defaults: context.defaults,
            experimentRoll: { roll },
            initialPolicy: policy(singleDaily: true, hardPaywallEnabled: true)
        )

        store.enrollNewUserIfNeeded()

        #expect(store.accessCohort == .hardTrial)
        #expect(store.requiresProForApp(isPro: false))
    }

    @Test(arguments: [50, 99])
    func softAccessUsesTheSecondHalfOfTheRollout(roll: Int) {
        let context = context()
        let store = MonetizationStore(
            defaults: context.defaults,
            experimentRoll: { roll },
            initialPolicy: policy(singleDaily: true, hardPaywallEnabled: true)
        )

        store.enrollNewUserIfNeeded()

        #expect(store.accessCohort == .experimentSoft)
        #expect(store.requiresProForApp(isPro: false) == false)
    }

    @Test func hardAccessIntroPresentsOnlyOnce() {
        let context = context()
        let store = MonetizationStore(
            defaults: context.defaults,
            experimentRoll: { 0 },
            initialPolicy: policy(singleDaily: true, hardPaywallEnabled: true)
        )
        store.enrollNewUserIfNeeded()

        #expect(store.shouldPresentHardAccessIntro)
        store.markHardAccessIntroPresented()
        #expect(store.shouldPresentHardAccessIntro == false)
    }

    @Test func remoteKillSwitchUnlocksHardCohort() {
        let context = context()
        let enabledStore = MonetizationStore(
            defaults: context.defaults,
            experimentRoll: { 0 },
            initialPolicy: policy(singleDaily: true, hardPaywallEnabled: true)
        )
        enabledStore.enrollNewUserIfNeeded()
        #expect(enabledStore.requiresProForApp(isPro: false))

        let disabledStore = MonetizationStore(
            defaults: context.defaults,
            initialPolicy: policy(singleDaily: true, hardPaywallEnabled: false)
        )
        #expect(disabledStore.accessCohort == .hardTrial)
        #expect(disabledStore.requiresProForApp(isPro: false) == false)
    }

    private func context() -> (defaults: UserDefaults, suite: String) {
        let suite = "MonetizationStoreTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return (defaults, suite)
    }

    private func policy(
        singleDaily: Bool,
        hardPaywallEnabled: Bool = false
    ) -> MonetizationPolicy {
        MonetizationPolicy(
            version: hardPaywallEnabled ? 3 : 1,
            accessExperiment: .init(
                enabled: hardPaywallEnabled,
                hardPaywallPercent: 50,
                trialDays: 7
            ),
            gates: .init(
                singleDaily: singleDaily,
                bulkRepeat: true,
                collectionCapacity: true,
                marketHistory: false,
                appearance: true
            ),
            limits: .init(
                singleScansPerDay: 3,
                introductoryBulkScans: 1,
                collectionUniqueItems: 10
            ),
            notifications: .init(
                enabled: true,
                scanReset: true,
                trialEnding: true,
                accountAction: true
            )
        )
    }
}
