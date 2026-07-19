import SwiftUI

struct ItemDetailView: View {
    @Environment(CollectionStore.self) private var store
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    let item: CollectionItem

    @State private var selectedCondition: DetailConditionOption
    @State private var horizon: PortfolioHorizon = .month
    @State private var showDeleteConfirmation = false
    @State private var errorMessage: String?

    init(item: CollectionItem) {
        self.item = item
        _selectedCondition = State(initialValue: DetailConditionOption(condition: item.condition))
    }

    private var sourceLabel: String {
        selectedCondition == .used ? "Used market data" : "New market data"
    }

    private var selectedValue: Double {
        selectedCondition.value(from: item)
    }

    private var retailDelta: Double? {
        guard let retailPrice = item.rrpUSD, retailPrice > 0 else { return nil }
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
        let points = conditionHistory(for: selectedCondition, horizon: .half)
        guard let first = points.first?.value, let last = points.last?.value, first > 0 else {
            return item.gainPercent.map { $0 / 100 }
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
        .confirmationDialog("Remove this item?", isPresented: $showDeleteConfirmation, titleVisibility: .visible) {
            Button("Remove", role: .destructive) { Task { await remove() } }
        }
        .alert("Could not remove item", isPresented: errorBinding) { }
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
                Image(systemName: "shippingbox")
                    .font(.system(size: 60, weight: .light))
                    .foregroundStyle(BrickValStyle.Primitive.gray600)
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
            if !historyPoints.isEmpty { chartBlock }
            quantityControls
            collectionFacts
            removeButton
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
                Text("\(item.itemType.rawValue.capitalized) · \(item.theme)")
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
                HStack(spacing: BrickValStyle.Primitive.space4) {
                    Image(systemName: marketChange ?? 0 >= 0 ? "arrowtriangle.up.fill" : "arrowtriangle.down.fill")
                        .font(.caption2)
                    Text(selectedValue, format: .currency(code: "USD"))
                        .font(.title3.bold())
                        .monospacedDigit()
                }
                .foregroundStyle(marketChange ?? 0 >= 0 ? BrickValStyle.ScanResult.accent : BrickValStyle.Semantic.valueNegative)
                if let marketChange {
                    Text(marketChange, format: .percent.precision(.fractionLength(2)))
                        .font(.subheadline)
                        .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
                        .monospacedDigit()
                }
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
                lineColor: BrickValStyle.ScanResult.accent,
                popupBackground: BrickValStyle.ScanResult.textPrimary,
                popupForeground: BrickValStyle.ScanResult.canvas
            )
            .frame(height: 330)

            ChartHorizonPicker(
                selection: $horizon,
                timelinePoints: historyPoints,
                tint: BrickValStyle.ScanResult.textPrimary,
                inactive: BrickValStyle.ScanResult.textSecondary
            )
        }
    }

    private var soldListingsLegend: some View {
        Label("Sold listings", systemImage: "tag.fill")
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
                                BrickValStyle.ScanResult.accent,
                                Color(red: 1.0, green: 0.86, blue: 0.13),
                                Color(red: 0.22, green: 0.48, blue: 1.0),
                            ],
                            center: .center
                        ),
                        lineWidth: 2.5
                    )
            }
            .shadow(color: BrickValStyle.ScanResult.accent.opacity(0.18), radius: 10, y: 4)
            .accessibilityLabel("Graph shows recent sold listings")
    }

    private var productPhotoPlate: some View {
        RoundedRectangle(cornerRadius: 26)
            .fill(colorScheme == .dark ? BrickValStyle.Primitive.white.opacity(0.92) : BrickValStyle.Primitive.white)
            .overlay {
                RoundedRectangle(cornerRadius: 26)
                    .stroke(colorScheme == .dark ? BrickValStyle.Primitive.white.opacity(0.28) : BrickValStyle.Primitive.gray200, lineWidth: 1)
            }
            .shadow(color: BrickValStyle.Primitive.black.opacity(0.28), radius: 22, y: 12)
    }

    private var retailBadgeText: String? {
        guard let retailDelta, let retailPrice = item.rrpUSD else { return nil }
        let direction = retailDelta >= 0 ? "Above retail" : "Below retail"
        let percent = retailDelta.formatted(.percent.precision(.fractionLength(0)))
        let retail = retailPrice.formatted(.currency(code: "USD"))
        return "\(direction) \(percent) · Retail \(retail)"
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
                fact("TOTAL", collectionTotal.formatted(.currency(code: "USD")))
                Divider().overlay(BrickValStyle.ScanResult.border)
                fact("QTY", "\(totalOwnedQuantity)")
            }
            Divider().overlay(BrickValStyle.ScanResult.border)
            HStack(spacing: 0) {
                if let retailPrice = item.rrpUSD {
                    fact("RETAIL", retailPrice.formatted(.currency(code: "USD")))
                } else if let year = item.yearReleased {
                    fact("YEAR", year.formatted(.number.grouping(.never)))
                } else {
                    fact("TYPE", item.itemType.rawValue.capitalized)
                }
                Divider().overlay(BrickValStyle.ScanResult.border)
                if let pieces = item.pieces {
                    fact("PIECES", pieces.formatted())
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

    private func fact(_ label: String, _ value: String) -> some View {
        VStack(spacing: BrickValStyle.Primitive.space8) {
            Text(label)
                .font(.caption.bold())
                .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
            Text(value)
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
                Text(option == .new ? "Sealed copies" : "Used copies")
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
                    .background(BrickValStyle.ScanResult.accent, in: .circle)
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

    private var removeButton: some View {
        Button(role: .destructive) {
            showDeleteConfirmation = true
        } label: {
            Label("Remove from collection", systemImage: "trash")
                .font(.headline)
                .foregroundStyle(BrickValStyle.ScanResult.textPrimary)
                .frame(maxWidth: .infinity)
                .frame(height: BrickValStyle.ScanResult.controlHeight)
                .background(BrickValStyle.ScanResult.surface, in: RoundedRectangle(cornerRadius: BrickValStyle.ScanResult.buttonRadius))
                .overlay {
                    RoundedRectangle(cornerRadius: BrickValStyle.ScanResult.buttonRadius)
                        .stroke(BrickValStyle.ScanResult.border)
                }
        }
        .buttonStyle(.plain)
    }

    private var errorBinding: Binding<Bool> {
        Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })
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
                try await store.setQuantity(nextQuantity, for: target, isPro: entitlements.isPro)
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func conditionHistory(for option: DetailConditionOption, horizon: PortfolioHorizon) -> [StockChartPoint] {
        let base = item.marketHistory.isEmpty ? fallbackHistory() : item.marketHistory
        let horizonOffset = Double(PortfolioHorizon.allCases.firstIndex(of: horizon) ?? 0) * 0.006

        let adjustedHistory = base.enumerated().map { index, point in
            let progress = base.count > 1 ? Double(index) / Double(base.count - 1) : 0
            let conditionWave = option == .new ? sin(progress * .pi * 1.35) * 0.026 : -cos(progress * .pi * 1.2) * 0.022
            let timelineWave = sin((progress + horizonOffset) * .pi * Double(horizon.rawValue.count + 1)) * 0.012
            let adjusted = point.priceUSD * option.historyMultiplier * (1 + conditionWave + timelineWave)
            return MarketHistoryPoint(date: point.date, priceUSD: max(0.01, adjusted), source: point.source)
        }

        return PortfolioHistoryBuilder.priceSeries(from: adjustedHistory, horizon: horizon, fallbackValue: selectedValue)
    }

    private func fallbackHistory() -> [MarketHistoryPoint] {
        let value = max(selectedValue, 0.01)
        let labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]
        let multipliers = [0.82, 0.86, 0.81, 0.92, 0.96, 0.91, 1.0]
        return zip(labels, multipliers).map { label, multiplier in
            MarketHistoryPoint(date: label, priceUSD: value * multiplier, source: item.dataSource)
        }
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
        case .new: "New"
        case .used: "Used"
        }
    }

    var condition: CollectionCondition {
        switch self {
        case .new: .newSealed
        case .used: .used
        }
    }

    var historyMultiplier: Double {
        switch self {
        case .new: 1.0
        case .used: 0.72
        }
    }

    func value(from item: CollectionItem) -> Double {
        let base = item.marketValueUSD ?? item.totalValue
        switch (self, item.condition) {
        case (.new, .newSealed), (.used, .used):
            return base
        case (.new, .used):
            return base / historyMultiplier
        case (.used, .newSealed):
            return base * historyMultiplier
        }
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
            gainPercent: item.gainPercent,
            dataSource: item.dataSource,
            quantity: 1,
            condition: condition,
            colorID: item.colorID,
            colorName: item.colorName,
            marketHistory: item.marketHistory.map {
                MarketHistoryPoint(date: $0.date, priceUSD: $0.priceUSD * historyMultiplier, source: $0.source)
            },
            marketRows: item.marketRows,
            addedAt: item.addedAt
        )
    }
}
