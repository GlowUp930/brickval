import SwiftUI

struct CollectionView: View {
    @Environment(CollectionStore.self) private var store
    @Environment(AppRouter.self) private var router
    @State private var searchText = ""
    @State private var filter: CollectionFilter = .all

    private var visibleItems: [CollectionItem] {
        store.items.filter { item in
            filter.includes(item) && (
                searchText.isEmpty ||
                item.name.localizedStandardContains(searchText) ||
                item.setNumber.localizedStandardContains(searchText)
            )
        }
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: BrickValStyle.pageSpacing) {
                PortfolioSummaryView(value: store.totalValue, itemCount: store.items.count, quantity: store.totalQuantity)
                PortfolioChartView(items: store.items)
                Picker("Collection filter", selection: $filter) {
                    ForEach(CollectionFilter.allCases) { Text($0.title).tag($0) }
                }
                .pickerStyle(.segmented)

                if visibleItems.isEmpty {
                    ContentUnavailableView(
                        searchText.isEmpty ? "Your collection is empty" : "No matching items",
                        systemImage: searchText.isEmpty ? "shippingbox" : "magnifyingglass",
                        description: Text(searchText.isEmpty ? "Scan your first LEGO item to begin." : "Try another name or item number.")
                    )
                    Button("Open scanner", systemImage: "viewfinder") {
                        router.selectedTab = .scan
                    }
                    .buttonStyle(.borderedProminent)
                } else {
                    ForEach(visibleItems) { item in
                        NavigationLink(value: AppRoute.collectionItem(item)) {
                            CollectionRowView(item: item)
                                .padding()
                                .background(.thinMaterial, in: .rect(cornerRadius: BrickValStyle.cardRadius))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Collection")
        .searchable(text: $searchText, prompt: "Name or item number")
        .refreshable { await store.load() }
    }
}

#Preview("Empty") {
    NavigationStack { CollectionView() }
        .environment(CollectionStore())
        .environment(AppRouter())
}
