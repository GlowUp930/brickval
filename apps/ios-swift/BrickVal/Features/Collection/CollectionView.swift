import SwiftUI

struct CollectionView: View {
    @Environment(CollectionStore.self) private var store
    @Environment(AppRouter.self) private var router
    @Environment(PreferencesStore.self) private var preferences
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(MonetizationStore.self) private var monetization
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var searchText = ""
    @State private var filter: CollectionFilter = .all
    @State private var isSearchVisible = false
    @State private var presentedSheet: CollectionSheet?
    @State private var horizon: PortfolioHorizon = .month
    @State private var isShowingCollectionTips = false
    @State private var purchaseMessage: String?

    private let gridColumns = [
        GridItem(.flexible(), spacing: BrickValStyle.CollectionLayout.gridGap),
        GridItem(.flexible(), spacing: BrickValStyle.CollectionLayout.gridGap),
    ]

    private var visibleItems: [CollectionDisplayItem] {
        store.displayItems.filter { item in
            filter.includes(item) && (
                searchText.isEmpty ||
                item.name.localizedStandardContains(searchText) ||
                item.setNumber.localizedStandardContains(searchText)
            )
        }
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                HStack(spacing: BrickValStyle.Primitive.space8) {
                    Text("Collection")
                        .font(.system(size: 30, weight: .bold))
                        .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                    Spacer()
                    headerButton("magnifyingglass", label: "Search collection") {
                        withAnimation(.snappy(duration: 0.2)) { isSearchVisible.toggle() }
                    }
                    headerButton("person.crop.circle", label: "Open account") {
                        presentedSheet = .account
                    }
                }
                .padding(.top, BrickValStyle.CollectionLayout.headerTop)

                if isSearchVisible {
                    HStack(spacing: BrickValStyle.Primitive.space8) {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                        TextField("Name or item number", text: $searchText)
                            .textInputAutocapitalization(.never)
                        Button("Close") {
                            searchText = ""
                            withAnimation(.snappy(duration: 0.2)) { isSearchVisible = false }
                        }
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(accent)
                    }
                    .frame(height: BrickValStyle.CollectionLayout.minimumTapTarget)
                    .padding(.horizontal, BrickValStyle.Primitive.space12)
                    .background(BrickValStyle.Semantic.surfaceMuted, in: .capsule)
                    .padding(.top, BrickValStyle.Primitive.space12)
                }

                if store.isLoading && store.items.isEmpty {
                    CollectionLoadingView()
                } else {
                    PortfolioSummaryView(value: store.totalValue, history: store.preparedHistory.portfolios[horizon]?.points ?? [], horizon: horizon)
                        .padding(.top, BrickValStyle.CollectionLayout.heroTop)
                    PortfolioChartView(
                        horizon: $horizon,
                        proHorizons: proHistoryHorizons,
                        isPro: entitlements.isPro,
                        onProSelection: { _ in presentHistoryUpgrade() }
                    )
                        .padding(.top, BrickValStyle.CollectionLayout.chartTop)
                    collectionCapacityStatus
                        .padding(.top, BrickValStyle.Primitive.space16)
                        .padding(.trailing, 72)

                    if visibleItems.isEmpty {
                        emptyCollectionState
                            .padding(.top, BrickValStyle.CollectionLayout.sectionTop)
                    } else {
                        HStack {
                            Text("Inventory")
                                .font(.system(size: 22, weight: .bold))
                                .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                            Spacer()
                            Menu {
                                Picker("Collection filter", selection: $filter) {
                                    ForEach(CollectionFilter.allCases) { Text($0.title).tag($0) }
                                }
                            } label: {
                                HStack(spacing: BrickValStyle.Primitive.space4) {
                                    Text(filter.title)
                                    Image(systemName: "chevron.down")
                                }
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                                .frame(minHeight: BrickValStyle.CollectionLayout.minimumTapTarget)
                            }
                        }
                        .padding(.top, BrickValStyle.CollectionLayout.sectionTop)

                        LazyVGrid(columns: gridColumns, alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
                            ForEach(visibleItems) { item in
                                NavigationLink(value: AppRoute.collectionItem(item.navigationItem)) {
                                    CollectionRowView(item: item)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, BrickValStyle.CollectionLayout.pageInset)
            .padding(.bottom, BrickValStyle.Primitive.space32)
        }
        .background(BrickValStyle.Semantic.canvas.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .task(id: store.items.map(\.id)) {
            store.prepareHistoryIfNeeded()
            guard let coordinator else { return }
            await store.refreshMarketHistory(using: coordinator.apiClient)
        }
        .task(id: scenePhase) {
            if scenePhase == .active { await store.refreshHistoryAtDayBoundary() }
        }
        .refreshable {
            await store.load()
            guard let coordinator else { return }
            await store.refreshMarketHistory(using: coordinator.apiClient, force: true)
        }
        .overlay(alignment: .bottomTrailing) {
            ZStack(alignment: .bottomTrailing) {
                if isShowingCollectionTips {
                    CollectionTipsCallout(dismiss: dismissCollectionTips)
                        .padding(.trailing, 4)
                        .padding(.bottom, 74)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }

                Button {
                    dismissCollectionTips()
                    presentedSheet = .manualSet
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(BrickValStyle.Primitive.black)
                        .frame(width: 60, height: 60)
                        .background(accent, in: .circle)
                        .shadow(color: BrickValStyle.Primitive.black.opacity(0.18), radius: 12, y: 6)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Add a LEGO set by number")
            }
            .padding(.trailing, BrickValStyle.CollectionLayout.pageInset)
            .padding(.bottom, BrickValStyle.Primitive.space20)
        }
        .task {
            guard !preferences.hasSeenCollectionTips else { return }
            if !reduceMotion {
                try? await Task.sleep(for: .milliseconds(420))
            }
            guard !Task.isCancelled, !preferences.hasSeenCollectionTips else { return }
            withAnimation(reduceMotion ? nil : .snappy(duration: 0.28)) {
                isShowingCollectionTips = true
            }
        }
        .sheet(item: $presentedSheet) { sheet in
            switch sheet {
            case .manualSet: ManualSetEntryView()
            case .account:
                NavigationStack {
                    AccountView()
                }
            }
        }
        .alert("BrickValue Pro", isPresented: purchaseMessageBinding) {
            Button("OK", role: .cancel) { purchaseMessage = nil }
        } message: {
            Text(purchaseMessage ?? "")
        }
    }

    @ViewBuilder
    private var collectionCapacityStatus: some View {
        if monetization.policy.gates.collectionCapacity {
            Button(action: presentCollectionUpgrade) {
                HStack(spacing: BrickValStyle.Primitive.space8) {
                    VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space4) {
                        if entitlements.isPro {
                            ProUnlimitedLabel(text: BrickValLocalization.localized("Unlimited items"))
                        } else {
                            Text("\(store.uniqueItemCount) of \(monetization.collectionLimit) free slots used")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                        }
                        if showsCapacityWarning {
                            Text("You have \(max(0, monetization.collectionLimit - store.uniqueItemCount)) slots left. Upgrade for an unlimited collection.")
                                .font(.caption)
                                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                                .multilineTextAlignment(.leading)
                        }
                    }
                    Spacer(minLength: BrickValStyle.Primitive.space8)
                    ProBadge(state: entitlements.isPro ? .active : .requiresPro)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(entitlements.isPro)
            .accessibilityHint(entitlements.isPro ? "" : "Shows unlimited collection upgrade options")
        }
    }

    private var showsCapacityWarning: Bool {
        !entitlements.isPro &&
            monetization.policy.gates.collectionCapacity &&
            store.uniqueItemCount >= 8
    }

    private var proHistoryHorizons: Set<PortfolioHorizon> {
        monetization.policy.gates.marketHistory ? [.quarter, .half] : []
    }

    private var purchaseMessageBinding: Binding<Bool> {
        Binding(
            get: { purchaseMessage != nil },
            set: { if !$0 { purchaseMessage = nil } }
        )
    }

    private func presentCollectionUpgrade() {
        guard !entitlements.isPro else { return }
        let presented = coordinator?.presentUpgrade(
            placement: .collectionLimitWarning,
            params: [
                "used": store.uniqueItemCount,
                "limit": monetization.collectionLimit,
            ]
        ) ?? false
        if !presented {
            purchaseMessage = BrickValLocalization.localized("Upgrade options are temporarily unavailable. Try again shortly.")
        }
    }

    private func presentHistoryUpgrade() {
        let presented = coordinator?.presentUpgrade(
            placement: .marketHistoryAttempt,
            params: ["source": "collection"]
        ) ?? false
        if !presented {
            purchaseMessage = BrickValLocalization.localized("Upgrade options are temporarily unavailable. Try again shortly.")
        }
    }

    private var emptyCollectionState: some View {
        let isEmpty = searchText.isEmpty
        let stateColor = isEmpty ? accent : BrickValStyle.Semantic.textSecondary

        return VStack(spacing: BrickValStyle.Primitive.space12) {
            Image(systemName: isEmpty ? "shippingbox" : "magnifyingglass")
                .font(.system(size: 30, weight: .semibold))
                .foregroundStyle(stateColor)
                .frame(width: 64, height: 64)
                .background(stateColor.opacity(0.12), in: .circle)
                .accessibilityHidden(true)

            Text(isEmpty ? "Your collection is empty" : "No matching items")
                .font(.headline)
                .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                .multilineTextAlignment(.center)

            Text(isEmpty ? "Scan your first LEGO item to start tracking its value." : "Try another name or item number.")
                .font(.subheadline)
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)

            if isEmpty {
                Button {
                    router.selectedTab = .scan
                } label: {
                    Label("Scan your first LEGO", systemImage: "viewfinder")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(accent)
                .foregroundStyle(BrickValStyle.Primitive.black)
                .controlSize(.large)
                .accessibilityHint("Opens the scanner")
                .padding(.top, BrickValStyle.Primitive.space4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, BrickValStyle.Primitive.space24)
        .accessibilityElement(children: .contain)
    }

    private func headerButton(_ systemName: String, label: LocalizedStringResource, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 22, weight: .medium))
                .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                .frame(
                    width: BrickValStyle.CollectionLayout.minimumTapTarget,
                    height: BrickValStyle.CollectionLayout.minimumTapTarget
                )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(BrickValLocalization.localized(label))
    }

    private func dismissCollectionTips() {
        guard isShowingCollectionTips || !preferences.hasSeenCollectionTips else { return }
        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
            isShowingCollectionTips = false
        }
        preferences.hasSeenCollectionTips = true
    }
}

private struct CollectionTipsCallout: View {
    @Environment(\.brickValAccent) private var accent
    let dismiss: () -> Void

    private let surface = Color(.secondarySystemBackground)

    var body: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
            HStack(alignment: .top, spacing: BrickValStyle.Primitive.space8) {
                Label("Quick start", systemImage: "sparkles")
                    .font(.headline)
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                Spacer(minLength: 0)
                Button(action: dismiss) {
                    Image(systemName: "xmark")
                        .font(.caption.weight(.bold))
                        .frame(width: 30, height: 30)
                }
                .buttonStyle(.plain)
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                .accessibilityLabel("Dismiss collection tips")
            }

            Text("A few things to get you started")
                .font(.subheadline)
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)

            tipRow("plus.circle.fill", title: "Add a set", detail: "Use the + button below to add a set by number.")
            tipRow("viewfinder", title: "Scan items", detail: "Use Scan to identify minifigures and groups.")
            tipRow("chart.line.uptrend.xyaxis", title: "Track value", detail: "Open an item for market history and New or Used prices.")

            Button("Got it", action: dismiss)
                .buttonStyle(.borderedProminent)
                .tint(accent)
                .foregroundStyle(BrickValStyle.Primitive.black)
                .frame(maxWidth: .infinity)
                .accessibilityHint("Dismisses the collection tips")
        }
        .padding(BrickValStyle.Primitive.space16)
        .frame(maxWidth: 320, alignment: .leading)
        .background(surface, in: .rect(cornerRadius: 18))
        .overlay {
            RoundedRectangle(cornerRadius: 18)
                .stroke(BrickValStyle.Semantic.divider, lineWidth: 1)
        }
        .overlay(alignment: .bottomTrailing) {
            Image(systemName: "arrowtriangle.down.fill")
                .font(.system(size: 17))
                .foregroundStyle(surface)
                .offset(x: -22, y: 11)
        }
        .shadow(color: BrickValStyle.Primitive.black.opacity(0.24), radius: 18, y: 8)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Collection quick start tips")
    }

    private func tipRow(_ icon: String, title: LocalizedStringResource, detail: LocalizedStringResource) -> some View {
        HStack(alignment: .top, spacing: BrickValStyle.Primitive.space8) {
            Image(systemName: icon)
                .font(.body.weight(.semibold))
                .foregroundStyle(accent)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                Text(detail)
                    .font(.footnote)
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

private enum CollectionSheet: String, Identifiable {
    case manualSet
    case account
    var id: String { rawValue }
}

struct CollectionDisplayItem: Identifiable, Hashable {
    let id: String
    let setNumber: String
    let itemType: ItemType
    let name: String
    let theme: String
    let imageURL: URL?
    let quantity: Int
    let totalValue: Double
    let navigationItem: CollectionItem

    static func make(from items: [CollectionItem]) -> [CollectionDisplayItem] {
        var grouped: [String: [CollectionItem]] = [:]
        var orderedKeys: [String] = []

        for item in items {
            let key = displayKey(for: item)
            if grouped[key] == nil {
                orderedKeys.append(key)
                grouped[key] = []
            }
            grouped[key]?.append(item)
        }

        return orderedKeys.compactMap { key in
            guard let group = grouped[key], let first = group.first else { return nil }
            return CollectionDisplayItem(
                id: key,
                setNumber: first.setNumber,
                itemType: first.itemType,
                name: first.name,
                theme: first.theme,
                imageURL: group.compactMap(\.imageURL).first,
                quantity: group.reduce(0) { $0 + $1.quantity },
                totalValue: group.reduce(0) { $0 + $1.totalValue },
                navigationItem: first
            )
        }
    }

    private static func displayKey(for item: CollectionItem) -> String {
        "\(item.itemType.rawValue)-\(item.setNumber)-\(item.colorID.map(String.init) ?? "none")"
    }
}

#Preview("Empty") {
    NavigationStack { CollectionView() }
        .environment(CollectionStore())
        .environment(AppRouter())
        .environment(PreferencesStore())
        .environment(EntitlementStore())
        .environment(MonetizationStore())
        .environment(CurrencyStore())
}
