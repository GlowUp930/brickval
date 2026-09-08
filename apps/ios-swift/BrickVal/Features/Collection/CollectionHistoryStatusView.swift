import SwiftUI

struct CollectionHistoryStatusView: View {
    @Environment(CollectionStore.self) private var store
    @Environment(\.appSDKCoordinator) private var coordinator
    let hasHistory: Bool

    var body: some View {
        VStack(spacing: 8) {
            if store.isRefreshingHistory {
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
                Text("Not enough dated sales for this period")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
    }
}
