import SwiftUI

struct HardScanAccessView: View {
    @Environment(MonetizationStore.self) private var monetization
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var contentVisible = false

    var body: some View {
        ZStack {
            BrickValStyle.Primitive.black
                .ignoresSafeArea()

            GeometryReader { proxy in
                let isCompact = proxy.size.height < 820

                ScrollView {
                    VStack(spacing: isCompact ? BrickValStyle.Primitive.space12 : BrickValStyle.Primitive.space24) {
                        hero(isCompact: isCompact)
                        benefits(isCompact: isCompact)
                        actions(isCompact: isCompact)
                    }
                    .frame(maxWidth: 520)
                    .padding(.horizontal, BrickValStyle.Primitive.space24)
                    .padding(.top, isCompact ? BrickValStyle.Primitive.space8 : BrickValStyle.Primitive.space24)
                    .padding(.bottom, 128)
                    .opacity(contentVisible ? 1 : 0)
                    .offset(y: reduceMotion || contentVisible ? 0 : 16)
                }
                .scrollIndicators(.hidden)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .preferredColorScheme(.dark)
        .task {
            reveal()
            guard monetization.shouldPresentHardAccessIntro else { return }
            monetization.markHardAccessIntroPresented()
            presentPaywall(source: "onboarding_complete")
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
        .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 8))
    }

    private func actions(isCompact: Bool) -> some View {
        VStack(spacing: isCompact ? BrickValStyle.Primitive.space8 : BrickValStyle.Primitive.space12) {
            Button {
                presentPaywall(source: "scanner_gate")
            } label: {
                Text("View Pro options")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.black)
                    .frame(maxWidth: .infinity, minHeight: isCompact ? 50 : 56)
                    .background(BrickValStyle.Semantic.builderYellow, in: Capsule())
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

    private func benefit(_ title: String, icon: String, isCompact: Bool) -> some View {
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
            ]
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
}
