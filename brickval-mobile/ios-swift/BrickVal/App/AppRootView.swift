import SwiftUI

struct AppRootView: View {
    @Environment(CollectionStore.self) private var collectionStore
    @Environment(PreferencesStore.self) private var preferences
    @State private var migration = LegacyExpoMigration()
    @State private var isReady = false
    @State private var migrationError: String?

    var body: some View {
        Group {
            if !isReady {
                ProgressView("Preparing Brickvalue…")
            } else if preferences.hasCompletedOnboarding {
                AppShellView()
            } else {
                OnboardingView()
            }
        }
        .task {
            await prepare()
        }
        .alert("Data migration needs another try", isPresented: migrationErrorBinding) {
            Button("Retry") { Task { await migrate() } }
            Button("Not now", role: .cancel) { migrationError = nil }
        } message: {
            Text(migrationError ?? "Your existing data has not been changed.")
        }
    }

    private var migrationErrorBinding: Binding<Bool> {
        Binding(
            get: { migrationError != nil },
            set: { if !$0 { migrationError = nil } }
        )
    }

    private func prepare() async {
        await collectionStore.load()
        await migrate()
        isReady = true
    }

    private func migrate() async {
        do {
            _ = try await migration.run(collectionStore: collectionStore, preferences: preferences)
            await collectionStore.load()
            migrationError = nil
        } catch {
            migrationError = "Brickvalue could not copy your Expo data yet. Nothing was deleted."
        }
    }
}
