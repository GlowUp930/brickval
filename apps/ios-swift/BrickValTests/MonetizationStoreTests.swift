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

        #expect(store.policy.version == 6)
        #expect(store.policy.lockedBulkPreview)
        #expect(store.policy.gates.singleDaily)
        #expect(store.scanReminder(isPro: false) == "3 free scans left today")
    }

    @Test func offerCodeRedemptionIsEnabledByDefault() {
        let context = context()
        let store = MonetizationStore(defaults: context.defaults)

        #expect(store.policy.gates.offerCodes)
    }

    @Test func bundledPolicyShowsLockedPreviewToNewSoftUsers() {
        let context = context()
        let store = MonetizationStore(defaults: context.defaults)

        store.enrollNewUserIfNeeded(seed: 50)

        #expect(store.accessCohort == .experimentSoft)
        #expect(store.policy.lockedBulkPreview)
        #expect(store.shouldUseLockedBulkPreview(isPro: false))
    }

    @Test func olderCachedPolicyWithoutOfferCodeFlagRemainsReadable() throws {
        let context = context()
        let legacyJSON = """
        {
          "version": 3,
          "accessExperiment": null,
          "gates": {
            "singleDaily": false,
            "bulkRepeat": true,
            "collectionCapacity": true,
            "marketHistory": false,
            "appearance": true
          },
          "limits": {
            "singleScansPerDay": 3,
            "introductoryBulkScans": 1,
            "collectionUniqueItems": 10
          },
          "notifications": {
            "enabled": true,
            "scanReset": true,
            "trialEnding": true,
            "accountAction": true
          }
        }
        """.data(using: .utf8)!

        let decoded = try JSONDecoder().decode(MonetizationPolicy.self, from: legacyJSON)
        #expect(decoded.version == 3)
        #expect(decoded.gates.singleDaily == false)
        #expect(decoded.gates.offerCodes)
        #expect(decoded.minimumAppBuild == nil)
        #expect(decoded.appUpdateURL == nil)

        context.defaults.set(legacyJSON, forKey: "brickvalue_monetization_policy")

        let store = MonetizationStore(defaults: context.defaults)

        #expect(store.policy.version == 6)
        #expect(store.policy.lockedBulkPreview)
        #expect(store.policy.gates.singleDaily)
        #expect(store.policy.gates.offerCodes)
    }

    @Test func remotePolicyCanDisableOfferCodeRedemption() {
        let context = context()
        let policy = policy(singleDaily: true, offerCodes: false)
        let store = MonetizationStore(
            defaults: context.defaults,
            initialPolicy: policy
        )

        #expect(store.policy.gates.offerCodes == false)
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

    @Test func successfulScanHistoryOnlyChangesOnSuccessfulScanEvent() {
        let context = context()
        let firstScan = Date(timeIntervalSince1970: 1_786_291_200)
        let store = MonetizationStore(
            defaults: context.defaults,
            now: { firstScan },
            initialPolicy: policy(singleDaily: true)
        )

        #expect(store.successfulSingleScanCount == 0)
        #expect(store.firstSuccessfulSingleScanAt == nil)

        store.recordSuccessfulSingle(serverUsage: nil)

        #expect(store.successfulSingleScanCount == 1)
        #expect(store.firstSuccessfulSingleScanAt == firstScan)
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

    @Test func anonymousBulkAllowanceFallsBackToLockedPreviewAfterSuccess() {
        let context = context()
        let store = MonetizationStore(defaults: context.defaults)

        #expect(store.canUseBulk(isPro: false))
        store.recordSuccessfulBulk(serverUsage: nil)
        #expect(store.shouldUseLockedBulkPreview(isPro: false))
        #expect(store.canUseBulk(isPro: false))
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

    @Test func newSoftUserHasLockedPreviewInsteadOfARealBulkCredit() {
        let context = context()
        let store = MonetizationStore(
            defaults: context.defaults,
            initialPolicy: policy(singleDaily: true, lockedBulkPreview: true)
        )

        store.enrollNewUserIfNeeded(seed: 50)

        #expect(store.accessCohort == .experimentSoft)
        #expect(store.usage.bulkScan.limit == 0)
        #expect(store.usage.bulkScan.remaining == 0)
        #expect(store.shouldUseLockedBulkPreview(isPro: false))
        #expect(store.canUseBulk(isPro: false))
        #expect(store.shouldUseLockedBulkPreview(isPro: true) == false)
    }

    @Test func existingUserKeepsTheIntroductoryBulkCredit() {
        let context = context()
        context.defaults.set(true, forKey: "has_completed_onboarding")

        let store = MonetizationStore(
            defaults: context.defaults,
            initialPolicy: .phaseOne
        )

        #expect(store.hasGrandfatheredBulkCredit)
        #expect(store.usage.bulkScan.limit == 1)
        #expect(store.usage.bulkScan.remaining == 1)
        #expect(store.shouldUseLockedBulkPreview(isPro: false) == false)
    }

    @Test func existingFreeUserWithNoBulkCreditsUsesLockedPreview() {
        let context = context()
        context.defaults.set(true, forKey: "has_completed_onboarding")

        let store = MonetizationStore(defaults: context.defaults, initialPolicy: .phaseOne)
        store.applyServerUsage(UsageSnapshot(
            isPro: false,
            singleScan: UsageCounter(used: 0, limit: 3, remaining: 3, resetsAt: nil),
            bulkScan: UsageCounter(used: 1, limit: 1, remaining: 0, resetsAt: nil)
        ))

        #expect(store.accessCohort == .legacySoft)
        #expect(store.shouldUseLockedBulkPreview(isPro: false))
        #expect(store.canUseBulk(isPro: false))
    }

    @Test func signedInExistingUserSyncsUnusedIntroductoryCredit() async {
        let context = context()
        context.defaults.set(true, forKey: "has_completed_onboarding")
        let store = MonetizationStore(defaults: context.defaults, initialPolicy: .phaseOne)
        let probe = LegacyCreditSyncProbe()
        var api = BrickValAPIClient.testStub
        api.syncLegacyBulkCredit = { installationID in
            await probe.record(installationID)
            return true
        }

        await store.refresh(using: api, signedIn: true)

        #expect(await probe.count == 1)
        #expect(await probe.lastInstallationID != nil)
    }

    @Test func referralCreditsDisableTheLockedPreview() {
        let context = context()
        let store = MonetizationStore(
            defaults: context.defaults,
            initialPolicy: policy(singleDaily: true, lockedBulkPreview: true)
        )
        store.enrollNewUserIfNeeded(seed: 50)
        store.applyReferralStatus(
            ReferralStatus(
                code: "BRICKVAL",
                qualifiedCount: 3,
                goal: 3,
                bonusBulkScans: 3,
                bulkCreditsRemaining: 3,
                rewardGranted: true
            )
        )

        #expect(store.shouldUseLockedBulkPreview(isPro: false) == false)
        #expect(store.canUseBulk(isPro: false))
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

    @Test func superwallSeedWinsOverLocalFallbackAndPersists() {
        let context = context()
        let firstStore = MonetizationStore(
            defaults: context.defaults,
            experimentRoll: { 99 },
            initialPolicy: policy(singleDaily: true, hardPaywallEnabled: true)
        )

        firstStore.enrollNewUserIfNeeded(seed: 49)

        #expect(firstStore.experimentSeed == 49)
        #expect(firstStore.accessCohort == .hardTrial)

        let secondStore = MonetizationStore(
            defaults: context.defaults,
            experimentRoll: { 99 },
            initialPolicy: policy(singleDaily: true, hardPaywallEnabled: true)
        )

        #expect(secondStore.experimentSeed == 49)
        #expect(secondStore.accessCohort == .hardTrial)
    }

    @Test func softAccessIntroPresentsOnlyOnce() {
        let context = context()
        let store = MonetizationStore(
            defaults: context.defaults,
            initialPolicy: policy(singleDaily: true, hardPaywallEnabled: true)
        )

        store.enrollNewUserIfNeeded(seed: 50)

        #expect(store.shouldPresentSoftAccessIntro)
        store.markSoftAccessIntroPresented()
        #expect(store.shouldPresentSoftAccessIntro == false)
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

    @Test func oldBuildIsBlockedWhenRemoteMinimumBuildIsEnabled() {
        let context = context()
        let minimumBuild = policy(singleDaily: true, minimumAppBuild: 142)
        let oldStore = MonetizationStore(
            defaults: context.defaults,
            initialPolicy: minimumBuild,
            currentAppBuild: 141
        )
        let currentStore = MonetizationStore(
            defaults: context.defaults,
            initialPolicy: minimumBuild,
            currentAppBuild: 142
        )

        #expect(oldStore.requiresUpdate)
        #expect(oldStore.minimumSupportedBuild == 142)
        #expect(currentStore.requiresUpdate == false)
    }

    private func context() -> (defaults: UserDefaults, suite: String) {
        let suite = "MonetizationStoreTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return (defaults, suite)
    }

    private func policy(
        singleDaily: Bool,
        hardPaywallEnabled: Bool = false,
        offerCodes: Bool = true,
        lockedBulkPreview: Bool = false,
        minimumAppBuild: Int? = nil
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
                appearance: true,
                offerCodes: offerCodes
            ),
            limits: .init(
                singleScansPerDay: 3,
                introductoryBulkScans: 1,
                collectionUniqueItems: 10
            ),
            lockedBulkPreview: lockedBulkPreview,
            notifications: .init(
                enabled: true,
                scanReset: true,
                trialEnding: true,
                accountAction: true
            ),
            minimumAppBuild: minimumAppBuild
        )
    }
}

private actor LegacyCreditSyncProbe {
    private(set) var count = 0
    private(set) var lastInstallationID: String?

    func record(_ installationID: String) {
        count += 1
        lastInstallationID = installationID
    }
}

private extension BrickValAPIClient {
    static let testStub = BrickValAPIClient(
        scanMinifigure: { _ in throw MonetizationStoreTestError.unusedEndpoint },
        scanBulkMinifigures: { _, _, _ in throw MonetizationStoreTestError.unusedEndpoint },
        recoverBulkMinifigure: { _, _ in throw MonetizationStoreTestError.unusedEndpoint },
        identify: { _, _, _ in throw MonetizationStoreTestError.unusedEndpoint },
        lookup: { _, _, _ in throw MonetizationStoreTestError.unusedEndpoint },
        bulkLookupMinifigures: { _, _ in throw MonetizationStoreTestError.unusedEndpoint },
        monetizationStatus: {
            MonetizationStatus(policy: .phaseOne, usage: .empty(policy: .phaseOne))
        },
        syncSubscription: { throw MonetizationStoreTestError.unusedEndpoint },
        partColors: { throw MonetizationStoreTestError.unusedEndpoint },
        submitFeedback: { _ in throw MonetizationStoreTestError.unusedEndpoint },
        submitProductFeedback: { _ in throw MonetizationStoreTestError.unusedEndpoint },
        deleteAccount: { throw MonetizationStoreTestError.unusedEndpoint },
        registerNotificationDevice: { _ in throw MonetizationStoreTestError.unusedEndpoint },
        unregisterNotificationDevice: { _ in throw MonetizationStoreTestError.unusedEndpoint }
    )
}

private enum MonetizationStoreTestError: Error {
    case unusedEndpoint
}
