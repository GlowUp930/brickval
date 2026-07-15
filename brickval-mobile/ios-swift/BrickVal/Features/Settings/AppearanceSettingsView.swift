import SwiftUI

struct AppearanceSettingsView: View {
    @Environment(PreferencesStore.self) private var preferences

    var body: some View {
        @Bindable var preferences = preferences
        Form {
            Section("Theme") {
                Picker("Theme", selection: $preferences.theme) {
                    ForEach(ThemePreference.allCases) { Text($0.title).tag($0) }
                }
                .pickerStyle(.inline)
            }
            Section("Accent") {
                Picker("Accent colour", selection: $preferences.accent) {
                    ForEach(AccentPreference.allCases) { preference in
                        Label(preference.title, systemImage: preferences.accent == preference ? "checkmark.circle.fill" : "circle")
                            .tag(preference)
                    }
                }
                .pickerStyle(.inline)
            }
        }
        .navigationTitle("Appearance")
    }
}
