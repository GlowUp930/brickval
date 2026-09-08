import StoreKit
import SwiftUI

struct ScanResultView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.requestReview) private var requestReview
    @Environment(CollectionStore.self) private var collection
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(MonetizationStore.self) private var monetization
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(PreferencesStore.self) private var preferences
    @Environment(CurrencyStore.self) private var currency
    @Environment(\.brickValAccent) private var accent

    let result: LookupResult
    let reset: () -> Void

    @State private var quantity = 1
    @State private var horizon: PortfolioHorizon = .month
    @State private var isSaving = false
    @State private var didSave = false
    @State private var savedCondition: CollectionCondition?
    @State private var saveMessage: String?
    @State private var proMessage: String?
    @State private var errorMessage: String?

    private var commonSource: String? {
        let newSource = result.pricing.source(for: .newSealed)
        return newSource == result.pricing.source(for: .used) ? newSource : nil
    }

    private var sourceLabel: String {
        MarketPriceSourceCopy.title(for: commonSource)
    }

    private var sourceDetail: String {
        MarketPriceSourceCopy.detail(for: commonSource)
    }

    private var itemTypeLabel: String {
        switch result.itemType {
        case .minifig: BrickValLocalization.localized("Minifigure")
        case .set: BrickValLocalization.localized("LEGO set")
        case .part: BrickValLocalization.localized("LEGO part")
        }
    }

    private var historyPoints: [StockChartPoint] {
        PortfolioHistoryBuilder.priceSeries(
            from: result.marketHistory,
            horizon: horizon,
            fallbackValue: result.pricing.preferredNewValue ?? result.pricing.preferredUsedValue ?? 0
        )
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: BrickValStyle.ScanResult.sectionGap) {
                    productImage
                    identity
                    marketPrices
                    if !result.marketHistory.isEmpty { marketHistory }
                    collectionActions
                }
                .padding(.horizontal, BrickValStyle.ScanResult.pageInset)
                .padding(.bottom, BrickValStyle.Primitive.space32)
            }
            .background(BrickValStyle.ScanResult.canvas)
            .navigationTitle("Market Snapshot")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(BrickValStyle.ScanResult.canvas, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done", action: close) }
            }
            .sensoryFeedback(.success, trigger: didSave)
            .alert("Could not save", isPresented: errorBinding) {
                Button("OK", role: .cancel) { errorMessage = nil }
            } message: {
                Text(errorMessage ?? BrickValLocalization.localized("Try again"))
            }
            .alert("BrickValue Pro", isPresented: proMessageBinding) {
                Button("OK", role: .cancel) { proMessage = nil }
            } message: {
                Text(proMessage ?? "")
            }
            .overlay(alignment: .top) {
                if let saveMessage {
                    Label(saveMessage, systemImage: "checkmark.circle.fill")
                        .font(.headline)
                        .foregroundStyle(BrickValStyle.Primitive.black)
                        .padding(.horizontal, BrickValStyle.Primitive.space16)
                        .padding(.vertical, BrickValStyle.Primitive.space12)
                        .background(accent, in: .capsule)
                        .padding(.top, BrickValStyle.Primitive.space12)
                        .transition(.move(edge: .top).combined(with: .opacity))
                }
            }
        }
    }

    private var productImage: some View {
        AsyncImage(url: result.imageURL) { phase in
            switch phase {
            case .success(let image): image.resizable().scaledToFit()
            case .failure:
                Image(systemName: "shippingbox")
                    .font(.system(size: 56, weight: .light))
                    .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
            case .empty:
                SkeletonPlaceholder(
                    cornerRadius: BrickValStyle.ScanResult.buttonRadius,
                    fill: BrickValStyle.Primitive.gray200,
                    highlight: BrickValStyle.Primitive.white
                )
                .frame(width: 180, height: 180)
            @unknown default:
                EmptyView()
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: BrickValStyle.ScanResult.imageHeight)
        .padding(BrickValStyle.Primitive.space16)
        .background(BrickValStyle.Primitive.white, in: RoundedRectangle(cornerRadius: BrickValStyle.ScanResult.cardRadius))
        .accessibilityLabel("Product image for \(result.name)")
    }

    private var identity: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
            Text(result.name)
                .font(.system(.title, design: .rounded, weight: .bold))
                .foregroundStyle(BrickValStyle.ScanResult.textPrimary)
            Text("\(itemTypeLabel)  ·  \(result.theme)")
                .font(.headline)
                .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
            HStack(spacing: BrickValStyle.Primitive.space12) {
                Label(result.identifier, systemImage: "number")
                if let year = result.yearReleased { Label(String(year), systemImage: "calendar") }
                if let pieces = result.pieces { Label("\(pieces) pcs", systemImage: "square.grid.3x3") }
            }
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
        }
    }

    private var marketPrices: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
            HStack {
                Label(sourceLabel, systemImage: result.pricing.dataSource == "sold" ? "checkmark.seal.fill" : "tag.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(accent)
                Spacer()
                Text(verbatim: currency.displayCurrency(for: preferences.effectiveCurrency).code)
                    .font(.caption.bold())
                    .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
            }
            Text(sourceDetail)
                .font(.caption)
                .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 0) {
                priceColumn(title: "USED", value: result.pricing.preferredUsedValue, condition: .used)
                Divider().overlay(BrickValStyle.ScanResult.border)
                priceColumn(title: "NEW", value: result.pricing.preferredNewValue, condition: .newSealed)
            }
            .frame(height: 78)
            conversionCaption
        }
        .resultSurface()
    }

    private var conversionCaption: some View {
        let requestedCurrency = preferences.effectiveCurrency
        let displayCurrency = currency.displayCurrency(for: requestedCurrency)
        return Group {
            if displayCurrency != .usd {
                HStack(spacing: BrickValStyle.Primitive.space4) {
                    Text("Converted from USD")
                    Text("·")
                    Text(currency.formattedRateDate(locale: BrickValLocalization.effectiveLanguage.locale) ?? "—")
                }
            } else if requestedCurrency != .usd {
                Text("Currency conversion is unavailable. Values are shown in USD.")
            }
        }
        .font(.caption2)
        .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
    }

    private func priceColumn(title: LocalizedStringResource, value: Double?, condition: CollectionCondition) -> some View {
        VStack(spacing: BrickValStyle.Primitive.space8) {
            Text(title).font(.caption.bold()).foregroundStyle(BrickValStyle.ScanResult.textSecondary)
            if let value {
                CountingCurrencyText(value: value)
                Text(MarketPriceSourceCopy.title(for: result.pricing.source(for: condition)))
                    .font(.caption2)
                    .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
                    .multilineTextAlignment(.center)
            } else {
                Text("No data")
            }
        }
        .font(.system(.title2, design: .rounded, weight: .bold))
        .foregroundStyle(BrickValStyle.ScanResult.textPrimary)
        .frame(maxWidth: .infinity)
    }

    private var marketHistory: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
            HStack {
                VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space4) {
                    Text("MARKET HISTORY").font(.caption.bold()).foregroundStyle(BrickValStyle.ScanResult.textSecondary)
                    Text("Price Signal").font(.title3.bold()).foregroundStyle(BrickValStyle.ScanResult.textPrimary)
                }
                Spacer()
                Image(systemName: "chart.line.uptrend.xyaxis").foregroundStyle(accent)
            }
            InteractiveStockChart(
                points: historyPoints,
                lineColor: accent,
                popupBackground: BrickValStyle.ScanResult.textPrimary,
                popupForeground: BrickValStyle.ScanResult.canvas
            )
            .frame(height: BrickValStyle.ScanResult.chartHeight)
            ChartHorizonPicker(
                selection: $horizon,
                timelinePoints: historyPoints,
                tint: accent,
                inactive: BrickValStyle.ScanResult.textSecondary,
                proHorizons: proHistoryHorizons,
                isPro: entitlements.isPro,
                onProSelection: { _ in presentHistoryUpgrade() }
            )
        }
        .resultSurface()
    }

    private var collectionActions: some View {
        VStack(spacing: BrickValStyle.Primitive.space16) {
            Stepper("Collection Quantity: \(quantity)", value: $quantity, in: 1 ... 99)
                .font(.headline)
                .foregroundStyle(BrickValStyle.ScanResult.textPrimary)
                .tint(accent)
                .padding(.horizontal, BrickValStyle.Primitive.space16)
                .frame(minHeight: BrickValStyle.ScanResult.controlHeight)
                .background(BrickValStyle.ScanResult.surface, in: RoundedRectangle(cornerRadius: BrickValStyle.ScanResult.buttonRadius))
            HStack(spacing: BrickValStyle.Primitive.space12) {
                collectionButton("Add as Used", condition: .used, prominent: false)
                collectionButton("Add as New", condition: .newSealed, prominent: true)
            }
        }
    }

    private func collectionButton(_ title: LocalizedStringResource, condition: CollectionCondition, prominent: Bool) -> some View {
        Button { save(condition: condition) } label: {
            let isSaved = savedCondition == condition
            let label = isSaved
                ? BrickValLocalization.localized("Added")
                : isSaving
                    ? BrickValLocalization.localized("Saving…")
                    : BrickValLocalization.localized(title)
            Label(label, systemImage: isSaved ? "checkmark.circle.fill" : "plus.circle.fill")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .frame(minHeight: BrickValStyle.ScanResult.controlHeight)
                .background((prominent || isSaved) ? accent : BrickValStyle.ScanResult.surface,
                            in: RoundedRectangle(cornerRadius: BrickValStyle.ScanResult.buttonRadius))
                .overlay {
                    if !prominent && !isSaved {
                        RoundedRectangle(cornerRadius: BrickValStyle.ScanResult.buttonRadius).stroke(BrickValStyle.ScanResult.border)
                    }
                }
                .foregroundStyle((prominent || isSaved) ? BrickValStyle.Primitive.black : BrickValStyle.ScanResult.textPrimary)
        }
        .buttonStyle(.plain)
        .disabled(isSaving)
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
            params: ["source": "scan_result"]
        ) ?? false
        if !presented {
            proMessage = BrickValLocalization.localized("Upgrade options are temporarily unavailable. Try again shortly.")
        }
    }

    private func save(condition: CollectionCondition) {
        Task {
            isSaving = true
            defer { isSaving = false }
            do {
                try await collection.add(
                    result.collectionItem(quantity: quantity, condition: condition),
                    isPro: entitlements.isPro || !monetization.policy.gates.collectionCapacity,
                    freeLimit: monetization.collectionLimit
                )
                withAnimation(.spring(response: 0.22, dampingFraction: 0.84)) {
                    savedCondition = condition
                    saveMessage = BrickValLocalization.localized("Added to collection")
                    didSave = true
                }
                if !preferences.hasRequestedReview {
                    preferences.hasRequestedReview = true
                    requestReview()
                }
                coordinator?.analytics.capture(
                    PostHogEvent.itemAddedToCollection,
                    properties: [
                        "item_type": result.itemType.rawValue,
                        "condition": condition.rawValue,
                        "quantity": quantity,
                    ]
                )
                Task {
                    try? await Task.sleep(for: .seconds(1.8))
                    await MainActor.run {
                        withAnimation(.easeOut(duration: 0.2)) {
                            saveMessage = nil
                        }
                    }
                }
            } catch is CollectionStoreError {
                let presented = coordinator?.presentProFeature(
                    placement: .collectionLimitReached,
                    params: [
                        "used": collection.uniqueItemCount,
                        "limit": monetization.collectionLimit,
                    ]
                ) {
                    save(condition: condition)
                } ?? false
                if !presented {
                    errorMessage = BrickValLocalization.localized("Upgrade options are temporarily unavailable. Try again shortly.")
                }
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func close() {
        reset()
        dismiss()
    }
}

private extension View {
    func resultSurface() -> some View {
        padding(BrickValStyle.Primitive.space16)
            .background(BrickValStyle.ScanResult.surface, in: RoundedRectangle(cornerRadius: BrickValStyle.ScanResult.cardRadius))
            .overlay {
                RoundedRectangle(cornerRadius: BrickValStyle.ScanResult.cardRadius).stroke(BrickValStyle.ScanResult.border)
            }
    }
}

private struct CountingCurrencyText: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(PreferencesStore.self) private var preferences
    @Environment(CurrencyStore.self) private var currency
    let value: Double
    @State private var animatedValue = 0.0

    var body: some View {
        let displayCurrency = currency.displayCurrency(for: preferences.effectiveCurrency)
        let locale = BrickValLocalization.effectiveLanguage.locale
        let amount = currency.formatted(animatedValue, to: preferences.effectiveCurrency, locale: locale)

        HStack(alignment: .firstTextBaseline, spacing: BrickValStyle.Primitive.space4) {
            Text(verbatim: amount)
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.72)
                .contentTransition(.numericText())
            Text(verbatim: displayCurrency.code)
                .font(.caption2.weight(.semibold))
                .tracking(0.35)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(verbatim: "\(amount), \(displayCurrency.code)"))
        .onAppear {
            if reduceMotion {
                animatedValue = value
            } else {
                withAnimation(.easeOut(duration: 0.72)) {
                    animatedValue = value
                }
            }
        }
        .onChange(of: value) { _, newValue in
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.42)) {
                animatedValue = newValue
            }
        }
    }
}
