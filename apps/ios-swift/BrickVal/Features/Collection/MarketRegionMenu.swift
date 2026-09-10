import SwiftUI

struct MarketRegionMenu: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Binding var selection: MarketRegion
    let regions: [MarketRegion]
    let tint: Color

    private var menuRegions: [MarketRegion] {
        var result = regions
        if !result.contains(selection) { result.append(selection) }
        return result.sorted { lhs, rhs in
            if lhs.isAll != rhs.isAll { return lhs.isAll }
            return lhs.displayName(locale: preferences.effectiveLanguage.locale) < rhs.displayName(locale: preferences.effectiveLanguage.locale)
        }
    }

    var body: some View {
        Menu {
            Section("Seller country") {
                ForEach(menuRegions) { region in
                    Button {
                        guard selection != region else { return }
                        withAnimation(reduceMotion ? nil : .timingCurve(0.25, 1.0, 0.5, 1.0, duration: 0.22)) {
                            selection = region
                        }
                    } label: {
                        Label {
                            Text(region.menuTitle(locale: preferences.effectiveLanguage.locale))
                        } icon: {
                            Image(systemName: selection == region ? "checkmark" : "circle")
                        }
                    }
                }
            }
        } label: {
            Label(selection.displayName(locale: preferences.effectiveLanguage.locale), systemImage: "globe")
                .font(.caption.weight(.semibold))
                .foregroundStyle(tint)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .frame(minWidth: 44, minHeight: 44)
                .padding(.horizontal, BrickValStyle.Primitive.space8)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Market region: \(selection.displayName(locale: preferences.effectiveLanguage.locale))")
        .accessibilityHint("Choose which seller countries are included in market history")
        .accessibilityIdentifier("marketRegionMenu.\(selection.rawValue)")
    }
}
