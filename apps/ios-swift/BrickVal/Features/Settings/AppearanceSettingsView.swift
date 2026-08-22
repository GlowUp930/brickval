import SwiftUI

struct AppearanceSettingsView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(\.appSDKCoordinator) private var coordinator
    @State private var upgradeMessage: String?

    private let availableThemes: [ThemePreference] = [.dark, .light]

    var body: some View {
        @Bindable var preferences = preferences
        Group {
            if entitlements.isPro {
                Form {
                    Section("Theme") {
                        Picker("Theme", selection: $preferences.theme) {
                            ForEach(availableThemes) { Text($0.title).tag($0) }
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
                .onAppear {
                    if preferences.theme == .system {
                        preferences.theme = .dark
                    }
                }
            } else {
                List {
                    Section {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Theme and accent")
                                    .font(.title2.bold())
                                Spacer()
                                ProBadge(state: .requiresPro)
                            }
                            Text("Upgrade to change between light and dark themes and choose your accent colour.")
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical)
                    }

                    Section {
                        Button("Upgrade to Pro", systemImage: "arrow.up.right", action: presentUpgrade)
                            .buttonStyle(.borderedProminent)
                    }

                    if let upgradeMessage {
                        Section { Text(upgradeMessage).foregroundStyle(.secondary) }
                    }
                }
            }
        }
        .navigationTitle("Appearance")
    }

    private func presentUpgrade() {
        guard let coordinator else {
            upgradeMessage = "Upgrade options are not configured for this build."
            return
        }
        _ = coordinator.presentUpgrade(placement: .appearanceAttempt)
    }
}
