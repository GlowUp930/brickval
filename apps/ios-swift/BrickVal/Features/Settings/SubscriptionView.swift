import ClerkKit
import SwiftUI

struct SubscriptionView: View {
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(\.appSDKCoordinator) private var coordinator
    @State private var showAccount = false
    @State private var message: String?

    private var isSignedOut: Bool {
        coordinator?.clerk != nil && coordinator?.clerk?.user == nil
    }

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
                    Button(isSignedOut ? "Sign in to upgrade" : "View upgrade options", systemImage: isSignedOut ? "person.crop.circle.badge.plus" : "sparkles") {
                        if isSignedOut {
                            showAccount = true
                        } else if coordinator?.superwallConfigured == true {
                            coordinator?.presentUpgrade()
                        } else {
                            message = "Upgrade options are not configured for this build."
                        }
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

            if let message {
                Section { Text(message).foregroundStyle(.secondary) }
            }
        }
        .navigationTitle("Subscription")
        .sheet(isPresented: $showAccount) {
            NavigationStack {
                AccountView()
            }
        }
    }
}
