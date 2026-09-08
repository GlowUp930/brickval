import ClerkKit
import SwiftUI

struct SubscriptionView: View {
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(MonetizationStore.self) private var monetization
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
                    Label(
                        entitlements.isPro ? "BrickValue Pro is active" : "Upgrade to BrickValue Pro",
                        systemImage: entitlements.isPro ? "checkmark.seal.fill" : "sparkles"
                    )
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
                        } else if let coordinator {
                            coordinator.presentUpgrade()
                        } else {
                            message = BrickValLocalization.localized("Upgrade options are not configured for this build.")
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

            Section("BrickValue Pro") {
                proFeature("Unlimited bulk scanning", systemImage: "square.stack.3d.up")
                proFeature("Unlimited collection items", systemImage: "shippingbox")
                proFeature("Theme and accent controls", systemImage: "paintpalette")
            }

            if monetization.offerCodesEnabled {
                Section {
                    Button {
                        coordinator?.requestOfferCodeRedemption()
                    } label: {
                        Label("Redeem offer code", systemImage: "ticket")
                    }
                    .disabled(coordinator?.isOfferCodeRedemptionBusy == true)

                    OfferCodeRedemptionStatusView(
                        state: coordinator?.offerCodeRedemptionState ?? .idle,
                        onCheckAccess: {
                            Task { await coordinator?.checkOfferCodeAccess() }
                        }
                    )
                } header: {
                    Text("Offer code")
                } footer: {
                    Text("Redeem an eligible Apple offer code to unlock BrickValue Pro.")
                }
            }

            if let message {
                Section { Text(message).foregroundStyle(.secondary) }
            }
        }
        .navigationTitle("Subscription")
        .alert("Upgrade unavailable", isPresented: paywallErrorBinding) {
            Button("OK", role: .cancel) {
                coordinator?.dismissPaywallPresentationError()
            }
        } message: {
            Text(coordinator?.paywallPresentationError ?? BrickValLocalization.localized("Something went wrong. Please try again in a moment."))
        }
        .sheet(isPresented: $showAccount) {
            NavigationStack {
                AccountView()
            }
        }
    }

    private var paywallErrorBinding: Binding<Bool> {
        Binding(
            get: { coordinator?.paywallPresentationError != nil },
            set: { if !$0 { coordinator?.dismissPaywallPresentationError() } }
        )
    }

    private func proFeature(_ title: LocalizedStringResource, systemImage: String) -> some View {
        HStack(spacing: 12) {
            Label(title, systemImage: systemImage)
            Spacer()
            ProBadge(state: entitlements.isPro ? .active : .requiresPro)
        }
        .accessibilityElement(children: .combine)
    }
}
