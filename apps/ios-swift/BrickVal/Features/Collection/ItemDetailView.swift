import SwiftUI

struct ItemDetailView: View {
    @Environment(CollectionStore.self) private var store
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(MonetizationStore.self) private var monetization
    @Environment(PreferencesStore.self) private var preferences
    @Environment(CurrencyStore.self) private var currency
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.brickValAccent) private var accent
    let item: CollectionItem

    @State private var selectedCondition: DetailConditionOption
    @State private var horizon: PortfolioHorizon = .month
    @State private var showDeleteConfirmation = false
    @State private var errorMessage: String?
    @State private var proMessage: String?

    init(item: CollectionItem) {
        self.item = item
        _selectedCondition = State(initialValue: DetailConditionOption(condition: item.condition))
    }

    private var sourceLabel: String {
        MarketPriceSourceCopy.title(for: selectedItem?.dataSource)
    }

    private var sourceDetail: String {
        MarketPriceSourceCopy.detail(for: selectedItem?.dataSource)
    }

    private var itemTypeLabel: String {
        switch item.itemType {
        case .set: BrickValLocalization.localized("LEGO set")
        case .minifig: BrickValLocalization.localized("Minifigure")
        case .part: BrickValLocalization.localized("LEGO part")
        }
    }

    private var selectedItem: CollectionItem? {
        matchingItems.first { $0.condition == selectedCondition.condition }
            ?? (currentItem.condition == selectedCondition.condition ? currentItem : nil)
    }

    private var selectedValue: Double? { selectedItem?.marketValueUSD }

    private var retailDelta: Double? {
        guard let selectedValue, let retailPrice = item.rrpUSD, retailPrice > 0 else { return nil }
        return (selectedValue - retailPrice) / retailPrice
    }

    private var currentItem: CollectionItem {
        store.items.first { $0.id == item.id } ?? item
    }

    private var matchingItems: [CollectionItem] {
        store.items.filter {
            $0.setNumber == item.setNumber &&
                $0.itemType == item.itemType &&
                $0.colorID == item.colorID
        }
    }

    private var marketChange: Double? {
        let points = historyPoints
        guard points.count > 1, let first = points.first?.value, let last = points.last?.value, first > 0 else {
            return nil
        }
        return (last - first) / first
    }

    private var historyPoints: [StockChartPoint] {
        conditionHistory(for: selectedCondition, horizon: horizon)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: BrickValStyle.Primitive.space20) {
                heroImage
                marketCard
            }
            .padding(.horizontal, BrickValStyle.Primitive.space16)
            .padding(.top, BrickValStyle.Primitive.space16)
            .padding(.bottom, BrickValStyle.Primitive.space32)
        }
        .background(detailBackground.ignoresSafeArea())
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbarBackground(.hidden, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .principal) {
                HStack(spacing: BrickValStyle.Primitive.space8) {
                    Image("OnboardingLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 26, height: 26)
                        .clipShape(.rect(cornerRadius: 7))

                    Text("BrickValue")
                        .font(.system(.headline, design: .rounded).weight(.bold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                .foregroundStyle(BrickValStyle.Primitive.white)
                .accessibilityElement(children: .combine)
                .accessibilityLabel("BrickValue")
                .accessibilityIdentifier("collectionItem.brandHeader")
            }
        }
        .alert("Remove from collection?", isPresented: $showDeleteConfirmation) {
            Button("Remove", role: .destructive) {
                Task { await remove() }
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("This removes all \(totalOwnedQuantity) copy of \(item.name) from your collection.")
        }
        .alert("Could not remove item", isPresented: errorBinding) { }
        .alert("BrickValue Pro", isPresented: proMessageBinding) {
            Button("OK", role: .cancel) { proMessage = nil }
        } message: {
            Text(proMessage ?? "")
        }
    }

    private var detailBackground: some View {
        ZStack {
            BrickValStyle.ScanResult.canvas
            AsyncImage(url: item.imageURL) { image in
                image
                    .resizable()
                    .scaledToFill()
                    .blur(radius: 28)
                    .scaleEffect(1.18)
                    .opacity(0.34)
            } placeholder: {
                Color.clear
            }
            LinearGradient(
                colors: [
                    BrickValStyle.Primitive.black.opacity(0.2),
                    BrickValStyle.ScanResult.canvas.opacity(0.86),
                    BrickValStyle.ScanResult.canvas,
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        }
    }

    private var heroImage: some View {
        ZStack {
            productPhotoPlate
            AsyncImage(url: item.imageURL) { image in
                image
                    .resizable()
                    .scaledToFit()
                    .padding(BrickValStyle.Primitive.space16)
            } placeholder: {
                SkeletonPlaceholder(
                    cornerRadius: BrickValStyle.ScanResult.buttonRadius,
                    fill: BrickValStyle.Primitive.white,
                    highlight: BrickValStyle.Primitive.white
                )
                .frame(width: 180, height: 180)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 260)
        .accessibilityLabel("Product image for \(item.name)")
    }

    private var marketCard: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space20) {
            titleBlock
            priceSummaryRow
            conditionTabs
            if !historyPoints.isEmpty { chartBlock } else { Text("Price unavailable").foregroundStyle(.secondary) }
            quantityControls
            collectionFacts
            removeSection
        }
        .padding(BrickValStyle.Primitive.space20)
        .background(BrickValStyle.Primitive.black.opacity(0.82), in: RoundedRectangle(cornerRadius: BrickValStyle.ScanResult.cardRadius))
        .overlay {
            RoundedRectangle(cornerRadius: BrickValStyle.ScanResult.cardRadius)
                .stroke(BrickValStyle.ScanResult.border, lineWidth: 1)
        }
    }

    private var titleBlock: some View {
        HStack(alignment: .top, spacing: BrickValStyle.Primitive.space16) {
            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
                Text(item.name)
                    .font(.system(.title, design: .rounded, weight: .bold))
                    .foregroundStyle(BrickValStyle.ScanResult.textPrimary)
                    .lineLimit(2)
                Text("\(itemTypeLabel) · \(item.theme)")
                    .font(.title3)
                    .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
                    .lineLimit(2)
                Text("\(selectedCondition.title) · \(item.setNumber)")
                    .font(.title3)
                    .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
            }
            Spacer()
            Image(systemName: "star.fill")
                .font(.title2)
                .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
                .accessibilityHidden(true)
        }
    }

    private var priceSummaryRow: some View {
        HStack(alignment: .center) {
            VStack(alignment: .trailing, spacing: BrickValStyle.Primitive.space4) {
                Text(sourceLabel)
                    .font(.caption)
                    .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
                Text(sourceDetail)
                    .font(.caption2)
                    .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                HStack(spacing: BrickValStyle.Primitive.space4) {
                    if let marketChange {
                        Image(systemName: marketChange >= 0 ? "arrowtriangle.up.fill" : "arrowtriangle.down.fill")
                            .font(.caption2)
                    }
                    if let selectedValue {
                        BrickValCurrencyText(selectedValue)
                            .font(.title3.bold())
                            .monospacedDigit()
                    } else {
                        Text("Price unavailable")
                    }
                }
                .foregroundStyle(marketChange ?? 0 >= 0 ? accent : BrickValStyle.Semantic.valueNegative)
                if let marketChange {
                    Text(marketChange, format: .percent.precision(.fractionLength(2)).locale(BrickValLocalization.effectiveLanguage.locale))
                        .font(.subheadline)
                        .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
                        .monospacedDigit()
                }
                conversionCaption
            }
            .frame(maxWidth: .infinity, alignment: .trailing)

            if let retailBadgeText {
                retailBadge(retailBadgeText)
            }
        }
    }

    private var conditionTabs: some View {
        HStack(spacing: 0) {
            ForEach(DetailConditionOption.allCases) { option in
                itemTab(option.title, option: option)
            }
        }
        .padding(BrickValStyle.Primitive.space4)
        .background(BrickValStyle.ScanResult.surface, in: Capsule())
    }

    private func itemTab(_ title: String, option: DetailConditionOption) -> some View {
        Button {
            withAnimation(.spring(response: 0.2, dampingFraction: 0.84)) {
                selectedCondition = option
            }
        } label: {
            Text(title)
                .font(.headline.weight(.bold))
                .foregroundStyle(selectedCondition == option ? BrickValStyle.Primitive.black : BrickValStyle.ScanResult.textPrimary)
                .frame(maxWidth: .infinity)
                .frame(height: 46)
                .background(selectedCondition == option ? BrickValStyle.Primitive.gray200 : Color.clear, in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selectedCondition == option ? .isSelected : [])
    }

    private var chartBlock: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
            soldListingsLegend

            InteractiveStockChart(
                points: historyPoints,
                lineColor: accent,
                popupBackground: BrickValStyle.ScanResult.textPrimary,
                popupForeground: BrickValStyle.ScanResult.canvas
            )
            .id(horizon)
            .accessibilityIdentifier("collectionItem.valueChart")
            .frame(height: 330)

            ChartHorizonPicker(
                selection: $horizon,
                timelinePoints: historyPoints,
                tint: BrickValStyle.ScanResult.textPrimary,
                inactive: BrickValStyle.ScanResult.textSecondary,
                proHorizons: proHistoryHorizons,
                isPro: entitlements.isPro,
                onProSelection: { _ in presentHistoryUpgrade() }
            )
        }
    }

    private var soldListingsLegend: some View {
        Label(sourceLabel, systemImage: item.dataSource == "sold" ? "checkmark.seal.fill" : "tag.fill")
            .font(.headline.weight(.semibold))
            .foregroundStyle(BrickValStyle.ScanResult.textPrimary)
            .padding(.horizontal, BrickValStyle.Primitive.space16)
            .padding(.vertical, BrickValStyle.Primitive.space8)
            .background(BrickValStyle.Primitive.black.opacity(0.76), in: Capsule())
            .overlay {
                Capsule()
                    .stroke(
                        AngularGradient(
                            colors: [
                                Color(red: 0.22, green: 0.48, blue: 1.0),
                                Color(red: 0.28, green: 0.84, blue: 0.78),
                                accent,
                                Color(red: 1.0, green: 0.86, blue: 0.13),
                                Color(red: 0.22, green: 0.48, blue: 1.0),
                            ],
                            center: .center
                        ),
                        lineWidth: 2.5
                    )
            }
            .shadow(color: accent.opacity(0.18), radius: 10, y: 4)
            .accessibilityLabel(sourceDetail)
    }

    private var productPhotoPlate: some View {
        RoundedRectangle(cornerRadius: 26)
            .fill(BrickValStyle.Primitive.white)
            .overlay {
                RoundedRectangle(cornerRadius: 26)
                    .stroke(colorScheme == .dark ? BrickValStyle.Primitive.white.opacity(0.28) : BrickValStyle.Primitive.gray200, lineWidth: 1)
            }
            .shadow(color: BrickValStyle.Primitive.black.opacity(0.28), radius: 22, y: 12)
    }

    private var retailBadgeText: String? {
        guard let retailDelta, let retailPrice = item.rrpUSD else { return nil }
        let direction = retailDelta >= 0 ? BrickValLocalization.localized("Above retail") : BrickValLocalization.localized("Below retail")
        let percent = retailDelta.formatted(.percent.precision(.fractionLength(0)).locale(BrickValLocalization.effectiveLanguage.locale))
        let retail = currency.formattedWithCode(
            retailPrice,
            to: preferences.effectiveCurrency,
            locale: BrickValLocalization.effectiveLanguage.locale
        )
        return BrickValLocalization.localized("\(direction) \(percent) · Retail \(retail)")
    }

    private var conversionCaption: some View {
        let requestedCurrency = preferences.effectiveCurrency
        let displayCurrency = currency.displayCurrency(for: requestedCurrency)
        return Group {
            if displayCurrency != .usd {
                HStack(spacing: BrickValStyle.Primitive.space4) {
                    Text("Converted from USD")
                    if let date = currency.lastUpdatedText {
                        Text("·")
                        Text(currency.formattedRateDate(locale: BrickValLocalization.effectiveLanguage.locale) ?? date)
                    }
                }
                .font(.caption2)
                .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
            } else if requestedCurrency != .usd {
                Text("Currency conversion is unavailable. Values are shown in USD.")
                    .font(.caption2)
                    .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
            }
        }
    }

    private func retailBadge(_ text: String) -> some View {
        let isAboveRetail = (retailDelta ?? 0) >= 0
        return Text(text)
            .font(.caption.bold())
            .lineLimit(2)
            .multilineTextAlignment(.trailing)
            .minimumScaleFactor(0.82)
            .foregroundStyle(isAboveRetail ? BrickValStyle.ScanResult.retailAbove : BrickValStyle.ScanResult.retailBelow)
            .padding(.horizontal, BrickValStyle.Primitive.space12)
            .padding(.vertical, BrickValStyle.Primitive.space8)
            .background(BrickValStyle.ScanResult.retailBadgeSurface, in: Capsule())
            .overlay {
                Capsule()
                    .stroke(
                        isAboveRetail ? BrickValStyle.ScanResult.retailAbove.opacity(0.35) : BrickValStyle.ScanResult.retailBelow.opacity(0.35),
                        lineWidth: 1
                    )
            }
            .accessibilityLabel(text)
    }

    private var collectionFacts: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                fact("TOTAL", currency.formattedWithCode(collectionTotal, to: preferences.effectiveCurrency, locale: BrickValLocalization.effectiveLanguage.locale))
                Divider().overlay(BrickValStyle.ScanResult.border)
                fact("QTY", "\(totalOwnedQuantity)")
            }
            Divider().overlay(BrickValStyle.ScanResult.border)
            HStack(spacing: 0) {
                if let retailPrice = item.rrpUSD {
                    fact("RETAIL", currency.formattedWithCode(retailPrice, to: preferences.effectiveCurrency, locale: BrickValLocalization.effectiveLanguage.locale))
                } else if let year = item.yearReleased {
                    fact("YEAR", year.formatted(.number.grouping(.never).locale(BrickValLocalization.effectiveLanguage.locale)))
                } else {
                fact("TYPE", itemTypeLabel)
                }
                Divider().overlay(BrickValStyle.ScanResult.border)
                if let pieces = item.pieces {
                    fact("PIECES", pieces.formatted(.number.locale(BrickValLocalization.effectiveLanguage.locale)))
                } else {
                    fact("ITEM", item.setNumber)
                }
            }
        }
        .frame(minHeight: 128)
        .overlay {
            RoundedRectangle(cornerRadius: BrickValStyle.ScanResult.buttonRadius)
                .stroke(BrickValStyle.ScanResult.border)
        }
    }

    private func fact(_ label: LocalizedStringResource, _ value: String) -> some View {
        VStack(spacing: BrickValStyle.Primitive.space8) {
            Text(label)
                .font(.caption.bold())
                .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
            Text(verbatim: value)
                .font(.headline.bold())
                .foregroundStyle(BrickValStyle.ScanResult.textPrimary)
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.72)
        }
        .frame(maxWidth: .infinity, minHeight: 64)
    }

    private var quantityControls: some View {
        VStack(spacing: BrickValStyle.Primitive.space12) {
            quantityRow(option: .new)
            quantityRow(option: .used)
        }
    }

    private func quantityRow(option: DetailConditionOption) -> some View {
        HStack(spacing: BrickValStyle.Primitive.space12) {
            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space4) {
                Text(option.title)
                    .font(.headline)
                    .foregroundStyle(BrickValStyle.ScanResult.textPrimary)
                Text(option == .new ? BrickValLocalization.localized("Sealed copies") : BrickValLocalization.localized("Used copies"))
                    .font(.caption)
                    .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
            }
            Spacer()
            Button {
                adjustQuantity(for: option, delta: -1)
            } label: {
                Image(systemName: "minus")
                    .font(.headline)
                    .frame(width: 38, height: 38)
                    .background(BrickValStyle.ScanResult.surface, in: .circle)
                    .overlay { Circle().stroke(BrickValStyle.ScanResult.border) }
            }
            .buttonStyle(.plain)
            .disabled(quantity(for: option) == 0)
            .foregroundStyle(quantity(for: option) == 0 ? BrickValStyle.ScanResult.textSecondary : BrickValStyle.ScanResult.textPrimary)

            Text("\(quantity(for: option))")
                .font(.title3.bold())
                .monospacedDigit()
                .foregroundStyle(BrickValStyle.ScanResult.textPrimary)
                .frame(width: 36)

            Button {
                adjustQuantity(for: option, delta: 1)
            } label: {
                Image(systemName: "plus")
                    .font(.headline)
                    .frame(width: 38, height: 38)
                    .background(accent, in: .circle)
                    .foregroundStyle(BrickValStyle.Primitive.black)
            }
            .buttonStyle(.plain)
        }
        .padding(BrickValStyle.Primitive.space12)
        .background(BrickValStyle.Primitive.white.opacity(0.035), in: RoundedRectangle(cornerRadius: BrickValStyle.ScanResult.buttonRadius))
        .overlay {
            RoundedRectangle(cornerRadius: BrickValStyle.ScanResult.buttonRadius)
                .stroke(BrickValStyle.ScanResult.border)
        }
    }

    private var removeSection: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
            Text("Collection management")
                .font(.caption.weight(.semibold))
                .textCase(.uppercase)
                .tracking(0.4)
                .foregroundStyle(BrickValStyle.ScanResult.textSecondary)

            Button(role: .destructive) {
                showDeleteConfirmation = true
            } label: {
                Label("Remove item", systemImage: "trash")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(BrickValStyle.Semantic.valueNegative)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(
                        BrickValStyle.Semantic.valueNegative.opacity(0.10),
                        in: RoundedRectangle(cornerRadius: BrickValStyle.ScanResult.buttonRadius)
                    )
                    .overlay {
                        RoundedRectangle(cornerRadius: BrickValStyle.ScanResult.buttonRadius)
                            .stroke(BrickValStyle.Semantic.valueNegative.opacity(0.42), lineWidth: 1)
                    }
            }
            .buttonStyle(.plain)
            .accessibilityHint("Opens a confirmation before removing all copies")

            Text("Removes all copies of this product from your collection.")
                .font(.footnote)
                .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var errorBinding: Binding<Bool> {
        Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })
    }

    private var proMessageBinding: Binding<Bool> {
        Binding(get: { proMessage != nil }, set: { if !$0 { proMessage = nil } })
    }

    private var proHistoryHorizons: Set<PortfolioHorizon> {
        monetization.policy.gates.marketHistory ? [.quarter, .half] : []
    }

    private func presentHistoryUpgrade() {
        let presented = coordinator?.presentUpgrade(
            placement: .marketHistoryAttempt,
            params: ["source": "item_detail"]
        ) ?? false
        if !presented {
            proMessage = BrickValLocalization.localized("Upgrade options are temporarily unavailable. Try again shortly.")
        }
    }

    private func remove() async {
        do {
            try await store.remove(currentItem)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private var totalOwnedQuantity: Int {
        matchingItems.reduce(0) { $0 + $1.quantity }
    }

    private var collectionTotal: Double {
        matchingItems.reduce(0) { $0 + $1.totalValue }
    }

    private func quantity(for option: DetailConditionOption) -> Int {
        matchingItems.first { $0.condition == option.condition }?.quantity ?? 0
    }

    private func itemForQuantity(option: DetailConditionOption) -> CollectionItem {
        if let existing = matchingItems.first(where: { $0.condition == option.condition }) {
            return existing
        }
        return option.collectionItem(from: item)
    }

    private func adjustQuantity(for option: DetailConditionOption, delta: Int) {
        let nextQuantity = max(0, quantity(for: option) + delta)
        let target = itemForQuantity(option: option)

        Task {
            do {
                try await store.setQuantity(
                    nextQuantity,
                    for: target,
                    isPro: entitlements.isPro || !monetization.policy.gates.collectionCapacity,
                    freeLimit: monetization.collectionLimit
                )
            } catch is CollectionStoreError {
                let presented = coordinator?.presentProFeature(
                    placement: .collectionLimitReached,
                    params: [
                        "used": store.uniqueItemCount,
                        "limit": monetization.collectionLimit,
                    ]
                ) {
                    adjustQuantity(for: option, delta: delta)
                } ?? false
                if !presented {
                    errorMessage = BrickValLocalization.localized("Upgrade options are temporarily unavailable. Try again shortly.")
                }
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func conditionHistory(for option: DetailConditionOption, horizon: PortfolioHorizon) -> [StockChartPoint] {
        let sourceItem = matchingItems.first { $0.condition == option.condition }
            ?? (item.condition == option.condition ? item : nil)
        return PortfolioHistoryBuilder.priceSeries(
            from: sourceItem?.recordedHistory ?? [], horizon: horizon,
            fallbackValue: sourceItem?.marketValueUSD ?? 0
        )
    }

}

private enum DetailConditionOption: String, CaseIterable, Identifiable {
    case new
    case used

    var id: String { rawValue }

    init(condition: CollectionCondition) {
        self = condition == .used ? .used : .new
    }

    var title: String {
        switch self {
        case .new: BrickValLocalization.localized("New")
        case .used: BrickValLocalization.localized("Used")
        }
    }

    var condition: CollectionCondition {
        switch self {
        case .new: .newSealed
        case .used: .used
        }
    }

    func value(from item: CollectionItem) -> Double? {
        item.condition == condition ? item.marketValueUSD : nil
    }

    func collectionItem(from item: CollectionItem) -> CollectionItem {
        CollectionItem(
            setNumber: item.setNumber,
            itemType: item.itemType,
            name: item.name,
            theme: item.theme,
            pieces: item.pieces,
            yearReleased: item.yearReleased,
            isObsolete: item.isObsolete,
            imageURL: item.imageURL,
            marketValueUSD: value(from: item),
            rrpUSD: item.rrpUSD,
            gainPercent: item.condition == condition ? item.gainPercent : nil,
            dataSource: item.condition == condition ? item.dataSource : nil,
            quantity: 1,
            condition: condition,
            colorID: item.colorID,
            colorName: item.colorName,
            marketHistory: item.condition == condition ? item.marketHistory : [],
            marketRows: item.condition == condition ? item.marketRows : [],
            addedAt: item.addedAt
        )
    }
}
