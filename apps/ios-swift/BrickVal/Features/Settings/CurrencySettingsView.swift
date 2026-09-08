import SwiftUI

struct CurrencySettingsView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(CurrencyStore.self) private var currency

    var body: some View {
        @Bindable var preferences = preferences

        Form {
            Section {
                Picker("Currency", selection: $preferences.currencyOverride) {
                    Text("System default")
                        .tag(nil as BrickValCurrency?)

                    ForEach(BrickValCurrency.allCases) { option in
                        Text(verbatim: "\(option.displayName) (\(option.code))")
                            .tag(Optional(option))
                    }
                }
                .pickerStyle(.inline)
                .accessibilityIdentifier("settings.currencyPicker")
            } footer: {
                Text("Choose the currency used for BrickValue values. System default follows your device region.")
            }

            Section {
                let selectedCurrency = preferences.effectiveCurrency
                let activeCurrency = currency.displayCurrency(for: selectedCurrency)
                LabeledContent("Showing") {
                    Text(verbatim: "\(activeCurrency.displayName) (\(activeCurrency.code))")
                        .font(.subheadline.weight(.semibold))
                        .monospacedDigit()
                        .multilineTextAlignment(.trailing)
                }
                .accessibilityIdentifier("settings.currency.active")

                if selectedCurrency != activeCurrency {
                    Text("Currency conversion is unavailable. Values are shown in USD.")
                        .foregroundStyle(.secondary)
                }

                HStack {
                    Text("Rate date")
                    Spacer()
                    Text(currency.formattedRateDate(locale: BrickValLocalization.effectiveLanguage.locale) ?? "—")
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }

                if currency.payload?.stale == true {
                    Text("Rates are temporarily stale. Values use the last available update.")
                        .foregroundStyle(.secondary)
                } else if currency.conversionUnavailable ||
                            (selectedCurrency != .usd && currency.rate(for: selectedCurrency) == nil) {
                    Text("Currency conversion is unavailable. Values will show in USD until rates load.")
                        .foregroundStyle(.secondary)
                } else {
                    Text("Rates refresh daily and are estimates from USD.")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("Currency")
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        CurrencySettingsView()
    }
    .environment(PreferencesStore(defaults: UserDefaults(suiteName: "CurrencySettingsPreview")!))
    .environment(CurrencyStore(defaults: UserDefaults(suiteName: "CurrencySettingsCurrencyPreview")!))
}
