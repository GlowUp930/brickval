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

        #expect(store.policy.version == 2)
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

    private func context() -> (defaults: UserDefaults, suite: String) {
        let suite = "MonetizationStoreTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return (defaults, suite)
    }

    private func policy(singleDaily: Bool) -> MonetizationPolicy {
        MonetizationPolicy(
            version: 1,
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
            )
        )
    }
}
