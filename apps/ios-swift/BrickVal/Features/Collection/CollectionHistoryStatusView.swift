import SwiftUI

struct CollectionHistoryStatusView: View {
    @Environment(CollectionStore.self) private var store
    @Environment(PreferencesStore.self) private var preferences
    @Environment(\.appSDKCoordinator) private var coordinator
    let hasHistory: Bool
    var region: MarketRegion = .all
    var pointCount: Int = 0

    var body: some View {
        VStack(spacing: 8) {
            if store.isRefreshingHistory || store.isPreparingHistory {
                ProgressView("Loading market history…")
            } else if let error = store.historyErrorMessage {
                Text(error).font(.caption).foregroundStyle(.secondary)
                Button("Retry") {
                    Task {
                        guard let coordinator else { return }
                        await store.refreshMarketHistory(using: coordinator.apiClient, force: true)
                    }
                }
            } else if !hasHistory {
                let regionName = region.displayName(locale: preferences.effectiveLanguage.locale)
                Text(region.isAll || pointCount > 0
                    ? "Not enough dated sales for this period"
                    : "No \(regionName) seller sales in this period.")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
    }
}
