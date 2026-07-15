import SwiftUI

struct SubscriptionView: View {
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(\.appSDKCoordinator) private var coordinator
    @State private var isRestoring = false
    @State private var message: String?

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 12) {
                    Label(entitlements.isPro ? "Brickvalue Pro is active" : "Upgrade to Brickvalue Pro", systemImage: "crown.fill")
                        .font(.title2.bold())
                    Text(entitlements.isPro ? "Your collection and scanning benefits are unlocked." : "Save an unlimited collection and support continued pricing and scanner improvements.")
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical)
            }

            if !entitlements.isPro {
                Section {
                    Button("View upgrade options", systemImage: "sparkles") {
                        coordinator?.presentUpgrade()
                    }
                    .buttonStyle(.borderedProminent)
                } footer: {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Payment is charged to your Apple ID. Subscriptions renew automatically unless cancelled at least 24 hours before renewal.")
                        HStack {
                            Link("Terms", destination: AppLinks.terms)
                            Link("Privacy", destination: AppLinks.privacy)
                        }
                    }
                }
            }

            Section {
                Button(isRestoring ? "Restoring…" : "Restore purchases", systemImage: "arrow.clockwise", action: restore)
                    .disabled(isRestoring)
            }

            if let message {
                Section { Text(message).foregroundStyle(.secondary) }
            }
        }
        .navigationTitle("Subscription")
    }

    private func restore() {
        Task {
            isRestoring = true
            defer { isRestoring = false }
            do {
                try await coordinator?.restorePurchases()
                message = "Purchases restored."
            } catch {
                message = error.localizedDescription
            }
        }
    }
}
