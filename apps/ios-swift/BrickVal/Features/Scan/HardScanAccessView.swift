import ClerkKit
import SwiftUI

struct HardAccessStatusView: View {
    var body: some View {
        ZStack {
            BrickValStyle.Primitive.black.ignoresSafeArea()

            VStack(spacing: BrickValStyle.Primitive.space16) {
                ProgressView()
                    .tint(.white)
                    .controlSize(.large)
                Text("Checking your access...")
                    .font(.headline)
                    .foregroundStyle(.white.opacity(0.72))
            }
        }
        .preferredColorScheme(.dark)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Checking your BrickValue Pro access")
    }
}

struct HardScanAccessView: View {
    @Environment(MonetizationStore.self) private var monetization
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var showAccount = false
    @State private var contentVisible = false

    var body: some View {
        ZStack {
            BrickValStyle.Primitive.black
                .ignoresSafeArea()

            GeometryReader { proxy in
                let isCompact = proxy.size.height < 820
                let isShowingExistingFreeExplainer = shouldShowExistingFreeExplainer
                let topPadding = isCompact ? BrickValStyle.Primitive.space8 : BrickValStyle.Primitive.space24
                let bottomPadding = isShowingExistingFreeExplainer ? BrickValStyle.Primitive.space24 : 128.0

                ScrollView {
                    VStack(spacing: 0) {
                        if isShowingExistingFreeExplainer {
                            existingFreeExplainer(isCompact: isCompact)
                        } else {
                            hardAccessContent(isCompact: isCompact)
                        }
                    }
                    .frame(maxWidth: 520)
                    .frame(minHeight: max(0, proxy.size.height - topPadding - bottomPadding))
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, BrickValStyle.Primitive.space24)
                    .padding(.top, topPadding)
                    .padding(.bottom, bottomPadding)
                    .opacity(contentVisible ? 1 : 0)
                    .offset(y: reduceMotion || contentVisible ? 0 : 16)
                }
                .scrollIndicators(.hidden)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .preferredColorScheme(.dark)
        .sheet(isPresented: subscriptionFallbackBinding) {
            NavigationStack {
                SubscriptionView()
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Done") { coordinator?.dismissSubscriptionFallback() }
                        }
                }
            }
        }
        .sheet(isPresented: $showAccount) {
            NavigationStack { AccountView() }
        }
        .onChange(of: coordinator?.clerk?.user?.id) { _, userID in
            if userID != nil { showAccount = false }
        }
        .alert("Upgrade unavailable", isPresented: paywallErrorBinding) {
            Button("OK", role: .cancel) {
                coordinator?.dismissPaywallPresentationError()
            }
        } message: {
            Text(coordinator?.paywallPresentationError ?? BrickValLocalization.localized("Something went wrong. Please try again in a moment."))
        }
        .task {
            reveal()
        }
    }

    private var shouldShowExistingFreeExplainer: Bool {
        monetization.shouldPresentExistingFreeUserExplainer && !entitlements.isPro
    }

    private func hardAccessContent(isCompact: Bool) -> some View {
        VStack(spacing: isCompact ? BrickValStyle.Primitive.space12 : BrickValStyle.Primitive.space24) {
            hero(isCompact: isCompact)
            benefits(isCompact: isCompact)
            actions(isCompact: isCompact)
        }
    }

    private func existingFreeExplainer(isCompact: Bool) -> some View {
        VStack(spacing: isCompact ? BrickValStyle.Primitive.space16 : BrickValStyle.Primitive.space24) {
            Spacer(minLength: BrickValStyle.Primitive.space16)

            Capsule()
                .fill(Color(red: 0.72, green: 0.61, blue: 0.39))
                .frame(width: 32, height: 3)
                .accessibilityHidden(true)

            Text("A new chapter for BrickValue")
                .font(.system(.largeTitle, design: .rounded, weight: .semibold))
                .multilineTextAlignment(.center)
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)

            Text("We’re a small independent team. To keep building BrickValue, we’re moving to Pro access.")
                .font(.body)
                .lineSpacing(4)
                .multilineTextAlignment(.center)
                .foregroundStyle(.white.opacity(0.72))
                .fixedSize(horizontal: false, vertical: true)

            Text("Your collection is still saved on this device.")
                .font(.title3.weight(.semibold))
                .multilineTextAlignment(.center)
                .foregroundStyle(Color(red: 0.76, green: 0.87, blue: 0.79))
                .fixedSize(horizontal: false, vertical: true)

            Text("Subscribe to view your saved items and continue scanning.")
                .font(.body)
                .lineSpacing(4)
                .multilineTextAlignment(.center)
                .foregroundStyle(.white.opacity(0.72))
                .fixedSize(horizontal: false, vertical: true)

            Button(action: viewProOptions) {
                Text("View Pro options")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(Color(red: 0.09, green: 0.12, blue: 0.10))
                    .frame(maxWidth: .infinity, minHeight: 56)
                    .background(
                        Color(red: 0.78, green: 0.88, blue: 0.81),
                        in: Capsule()
                    )
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("hardAccess.existingFree.viewProOptions")

            existingFreeLinks

            Spacer(minLength: BrickValStyle.Primitive.space16)
        }
        .padding(.vertical, BrickValStyle.Primitive.space16)
    }

    private var existingFreeLinks: some View {
        VStack(spacing: 0) {
            Button("Restore purchases") {
                Task { try? await coordinator?.restorePurchases() }
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .accessibilityIdentifier("hardAccess.existingFree.restore")

            if monetization.offerCodesEnabled {
                Button("Redeem offer code") {
                    coordinator?.requestOfferCodeRedemption()
                }
                .frame(maxWidth: .infinity, minHeight: 44)
                .disabled(coordinator?.isOfferCodeRedemptionBusy == true)
                .accessibilityIdentifier("hardAccess.existingFree.offerCode")

                OfferCodeRedemptionStatusView(
                    state: coordinator?.offerCodeRedemptionState ?? .idle,
                    onCheckAccess: { Task { await coordinator?.checkOfferCodeAccess() } }
                )
                .foregroundStyle(.white.opacity(0.72))
            }

            if coordinator?.clerk?.user != nil {
                Button("Manage Account") { showAccount = true }
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .accessibilityIdentifier("hardAccess.existingFree.manageAccount")
            }
        }
        .font(.subheadline.weight(.medium))
        .foregroundStyle(.white.opacity(0.76))
        .buttonStyle(.plain)
    }

    private func viewProOptions() {
        monetization.markExistingFreeUserExplainerPresented()
        if coordinator?.clerk?.user == nil {
            showAccount = true
        } else {
            presentPaywall(source: "existing_free_access_explainer")
        }
    }

    private func hero(isCompact: Bool) -> some View {
        VStack(spacing: isCompact ? BrickValStyle.Primitive.space8 : BrickValStyle.Primitive.space16) {
            ZStack(alignment: .bottomTrailing) {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(BrickValStyle.Semantic.builderYellow)
                    .frame(width: isCompact ? 128 : 172, height: isCompact ? 128 : 172)

                Image("AvatarClassicSpace")
                    .resizable()
                    .scaledToFit()
                    .frame(width: isCompact ? 138 : 184, height: isCompact ? 138 : 184)
                    .accessibilityHidden(true)

                ProBadge(state: .requiresPro, compact: false)
                    .padding(BrickValStyle.Primitive.space12)
            }

            VStack(spacing: BrickValStyle.Primitive.space8) {
                Text("Scan with BrickValue Pro")
                    .font(.system(isCompact ? .title : .largeTitle, design: .rounded, weight: .black))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white)

                Text("Unlock automatic and bulk scanning, plus unlimited collection space with Pro.")
                    .font(isCompact ? .body : .title3)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white.opacity(0.72))
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }

    private func benefits(isCompact: Bool) -> some View {
        VStack(spacing: 0) {
            benefit("Automatic minifigure scanning", icon: "viewfinder", isCompact: isCompact)
            Divider().overlay(.white.opacity(0.12))
            benefit("Bulk scanning for multiple figures", icon: "square.stack.3d.up", isCompact: isCompact)
            Divider().overlay(.white.opacity(0.12))
            benefit("Unlimited collection items", icon: "shippingbox", isCompact: isCompact)
        }
        .padding(.horizontal, BrickValStyle.Primitive.space16)
        .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
    }

    private func actions(isCompact: Bool) -> some View {
        VStack(spacing: isCompact ? BrickValStyle.Primitive.space8 : BrickValStyle.Primitive.space12) {
            Button {
                if coordinator?.clerk?.user == nil {
                    showAccount = true
                } else {
                    presentPaywall(source: "scanner_gate")
                }
            } label: {
                Text(coordinator?.clerk?.user == nil ? "Sign in to upgrade" : "Subscribe")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.black)
                    .frame(maxWidth: .infinity, minHeight: isCompact ? 50 : 56)
                    .background(BrickValStyle.Semantic.builderYellow, in: Capsule())
            }

            if monetization.offerCodesEnabled {
                Button {
                    coordinator?.requestOfferCodeRedemption()
                } label: {
                    Label("Redeem offer code", systemImage: "ticket")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .disabled(coordinator?.isOfferCodeRedemptionBusy == true)

                OfferCodeRedemptionStatusView(
                    state: coordinator?.offerCodeRedemptionState ?? .idle,
                    onCheckAccess: {
                        Task { await coordinator?.checkOfferCodeAccess() }
                    }
                )
            }

            if coordinator?.clerk?.user != nil {
                Button("Manage Account") { showAccount = true }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(minHeight: 44)
            }

            Button("Restore purchases") {
                Task { try? await coordinator?.restorePurchases() }
            }
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.white)
            .frame(minHeight: 44)

            if !isCompact {
                Text("The App Store paywall shows the full renewal price and any trial terms before you confirm.")
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white.opacity(0.58))
            }
        }
    }

    private func benefit(_ title: LocalizedStringResource, icon: String, isCompact: Bool) -> some View {
        Label {
            Text(title)
                .font(.body.weight(.semibold))
                .foregroundStyle(.white)
        } icon: {
            Image(systemName: icon)
                .font(.headline)
                .foregroundStyle(BrickValStyle.Semantic.builderYellow)
                .frame(width: 28)
        }
        .frame(maxWidth: .infinity, minHeight: isCompact ? 44 : 54, alignment: .leading)
    }

    private func presentPaywall(source: String) {
        coordinator?.presentUpgrade(
            placement: .onboardingHardAccess,
            params: [
                "cohort": monetization.accessCohort?.rawValue ?? "unknown",
                "source": source,
                "trial_days": monetization.trialDays,
            ],
        )
    }

    private var subscriptionFallbackBinding: Binding<Bool> {
        Binding(
            get: { coordinator?.showsSubscriptionFallback == true },
            set: { if !$0 { coordinator?.dismissSubscriptionFallback() } }
        )
    }

    private var paywallErrorBinding: Binding<Bool> {
        Binding(
            get: { coordinator?.paywallPresentationError != nil },
            set: { if !$0 { coordinator?.dismissPaywallPresentationError() } }
        )
    }

    private func reveal() {
        withAnimation(reduceMotion ? nil : .timingCurve(0.22, 1, 0.36, 1, duration: 0.45)) {
            contentVisible = true
        }
    }
}

#Preview {
    NavigationStack { HardScanAccessView() }
        .environment(MonetizationStore(experimentRoll: { 0 }))
        .environment(EntitlementStore())
}
