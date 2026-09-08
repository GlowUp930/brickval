import SwiftUI

struct LanguageSettingsView: View {
    @Environment(PreferencesStore.self) private var preferences

    var body: some View {
        @Bindable var preferences = preferences

        Form {
            Section {
                Picker("Language", selection: $preferences.languageOverride) {
                    Text("System default")
                        .tag(nil as BrickValLanguage?)

                    ForEach(BrickValLanguage.allCases) { language in
                        Text(verbatim: language.displayName)
                            .tag(Optional(language))
                    }
                }
                .pickerStyle(.inline)
                .accessibilityIdentifier("settings.languagePicker")
            } footer: {
                Text("Choose the language used throughout BrickValue. System default follows your device language.")
            }
        }
        .navigationTitle("Language")
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        LanguageSettingsView()
    }
    .environment(PreferencesStore(defaults: UserDefaults(suiteName: "LanguageSettingsPreview")!))
}
