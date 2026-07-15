import SwiftUI

struct SettingsView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(CollectionStore.self) private var collection
    @Environment(EntitlementStore.self) private var entitlements
    @State private var showClearConfirmation = false
    @State private var clearError: String?

    var body: some View {
        @Bindable var preferences = preferences
        Form {
            Section("Account") {
                NavigationLink(value: AppRoute.account) {
                    Label("Account", systemImage: "person.crop.circle")
                }
                NavigationLink(value: AppRoute.subscription) {
                    LabeledContent {
                        Text(entitlements.isPro ? "Pro" : "Free")
                    } label: {
                        Label("Subscription", systemImage: "crown")
                    }
                }
            }

            Section("Scanning") {
                Toggle("Smart auto-scan", systemImage: "camera.viewfinder", isOn: $preferences.smartAutoScanEnabled)
                Toggle("Help improve scans", systemImage: "sparkles", isOn: $preferences.scanImprovementConsent)
                Text("When enabled, scan feedback and an image are uploaded only with your consent.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Section("Appearance") {
                NavigationLink(value: AppRoute.appearance) {
                    Label("Theme and accent", systemImage: "paintpalette")
                }
            }

            Section("Data") {
                LabeledContent("Saved quantity", value: collection.totalQuantity, format: .number)
                Button("Clear collection", systemImage: "trash", role: .destructive) {
                    showClearConfirmation = true
                }
            }

            Section("About") {
                Link(destination: AppLinks.privacy) {
                    Label("Privacy policy", systemImage: "hand.raised")
                }
                Link(destination: AppLinks.terms) {
                    Label("Terms of use", systemImage: "doc.text")
                }
                Link(destination: AppLinks.detectorAttribution) {
                    Label("Scanner model attribution", systemImage: "cpu")
                }
                LabeledContent("Version", value: version)
            }
        }
        .navigationTitle("Settings")
        .confirmationDialog("Clear your entire collection?", isPresented: $showClearConfirmation, titleVisibility: .visible) {
            Button("Clear collection", role: .destructive) { Task { await clearCollection() } }
        } message: {
            Text("This cannot be undone.")
        }
        .alert("Collection was not cleared", isPresented: errorBinding) { }
    }

    private var version: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.1"
    }

    private var errorBinding: Binding<Bool> {
        Binding(get: { clearError != nil }, set: { if !$0 { clearError = nil } })
    }

    private func clearCollection() async {
        do {
            try await collection.clear()
        } catch {
            clearError = error.localizedDescription
        }
    }
}
