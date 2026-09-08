import ClerkKit
import ClerkKitUI
import SwiftUI

struct ClerkAccountContentView: View {
    @Environment(Clerk.self) private var clerk
    @Environment(CollectionStore.self) private var collection
    @Environment(\.appSDKCoordinator) private var coordinator
    @State private var showDeleteConfirmation = false
    @State private var isDeleting = false
    @State private var deletionError: String?

    var body: some View {
        Group {
            if clerk.user == nil {
                BrickValueAuthView(isDismissible: false)
            } else {
                VStack(spacing: 0) {
                    UserProfileView(isDismissible: false)
                    Button("Delete Brickvalue account", role: .destructive) {
                        showDeleteConfirmation = true
                    }
                    .disabled(isDeleting)
                    .padding()
                }
            }
        }
        .navigationTitle("Manage Account")
        .task(id: clerk.user?.id) {
            await coordinator?.synchronizeIdentity(userID: clerk.user?.id)
        }
        .confirmationDialog(
            "Permanently delete your account?",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete account", role: .destructive) {
                Task { await deleteAccount() }
            }
        } message: {
            Text("This removes your Brickvalue account and local collection. This cannot be undone.")
        }
        .alert("Account was not deleted", isPresented: Binding(
            get: { deletionError != nil },
            set: { if !$0 { deletionError = nil } }
        )) {
            Button("OK", role: .cancel) { deletionError = nil }
        } message: {
            Text(deletionError ?? BrickValLocalization.localized("Try again"))
        }
    }

    private func deleteAccount() async {
        guard let coordinator else { return }
        isDeleting = true
        defer { isDeleting = false }
        do {
            // Clear confirmed local data first so a lost server response cannot leave it behind.
            try await collection.clearForAccountDeletion()
            try await coordinator.apiClient.deleteAccount()
            try? await clerk.auth.signOut()
            await coordinator.synchronizeIdentity(userID: nil)
        } catch {
            deletionError = error.localizedDescription
        }
    }
}
