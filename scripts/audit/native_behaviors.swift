// Compiled with actual app source by run_native_behaviors.py. Only localization
// and the chart's display-point type are stubbed to avoid booting the entire app.
import Foundation

enum BrickValLocalization {
    static func localized(_ value: String) -> String { value }
    static let effectiveLanguage = AuditLanguage()
}
struct AuditLanguage { let locale = Locale(identifier: "en_US") }
struct StockChartPoint { let label: String; let value: Double }

@main
struct NativeAudit {
    @MainActor static func main() async throws {
        let item = CollectionItem(setNumber: "12345", itemType: .set, name: "Audit", theme: "Audit", marketValueUSD: 100)
        let series = PortfolioHistoryBuilder.build(items: [item], horizon: .month)
        let suite = "bv-native-audit-\(UUID())"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let router = AppRouter(defaults: defaults)
        router.handle(url: URL(string: "https://brickvalue.live/r/ABCD2345")!)
        let restartedRouter = AppRouter(defaults: defaults)
        let ebay = try JSONDecoder().decode(LookupPricing.self, from: Data("{\"ebay_new_avg_usd\":100,\"ebay_used_avg_usd\":80,\"data_source\":\"sold\"}".utf8))
        let newOnly = try JSONDecoder().decode(LookupPricing.self, from: Data("{\"hero_new_avg_usd\":100}".utf8))

        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("bv-native-audit-\(UUID())")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let file = directory.appendingPathComponent("collection.json")
        let corrupt = Data("{broken collection data".utf8)
        try corrupt.write(to: file)
        let store = CollectionStore(repository: CollectionRepository(fileURL: file))
        await store.load()
        let loadFailed = store.errorMessage != nil
        do { try await store.add(item, isPro: true) } catch { /* Expected after a failed load. */ }
        let overwritten = try Data(contentsOf: file) != corrupt

        let failureStore = CollectionStore(repository: CollectionRepository(fileURL: directory))
        var writeFailureReported = false
        do { try await failureStore.add(item, isPro: true) } catch { writeFailureReported = true }

        let observations: [String: Any] = [
            "empty_history_produces_values": series.map(\.value),
            "pending_invite_before_restart": router.pendingReferralCode ?? "nil",
            "pending_invite_after_restart": restartedRouter.pendingReferralCode ?? "nil",
            "ebay_only_new_value": ebay.preferredNewValue as Any? ?? NSNull(),
            "ebay_only_used_value": ebay.preferredUsedValue as Any? ?? NSNull(),
            "new_only_payload_used_value": newOnly.preferredUsedValue as Any? ?? NSNull(),
            "corrupt_collection_load_reported": loadFailed,
            "add_after_load_failure_overwrites_original": overwritten,
            "write_failure_reported": writeFailureReported,
            "write_failure_rolls_back_empty_collection": failureStore.items.isEmpty,
        ]
        let data = try JSONSerialization.data(withJSONObject: observations, options: [.prettyPrinted, .sortedKeys])
        print(String(decoding: data, as: UTF8.self))
    }
}
