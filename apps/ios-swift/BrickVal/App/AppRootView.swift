import SwiftUI

struct AppRootView: View {
    @Environment(AppRouter.self) private var router
    @Environment(CollectionStore.self) private var collectionStore
    @Environment(PreferencesStore.self) private var preferences
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(MonetizationStore.self) private var monetization
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.brickValAPIClient) private var api
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var migration = LegacyExpoMigration()
    @State private var isReady = false
    @State private var isShowingLaunch = true
    @State private var launchIsHandingOff = false
    @State private var migrationError: String?

    var body: some View {
        ZStack {
            if isReady {
                Group {
                    if monetization.requiresUpdate {
                        UpdateRequiredView(
                            minimumBuild: monetization.minimumSupportedBuild,
                            updateURL: monetization.appUpdateURL ?? AppLinks.appStore
                        )
                    } else if preferences.hasCompletedOnboarding && !preferences.isReplayingOnboarding {
                        if monetization.accessCohort == .hardTrial && entitlements.isLoading && !entitlements.isPro {
                            HardAccessStatusView()
                        } else if monetization.requiresProForApp(isPro: entitlements.isPro) {
                            HardScanAccessView()
                        } else {
                            AppShellView()
                        }
                    } else {
                        OnboardingView(
                            entryPoint: preferences.shouldReturnToOnboardingAccount ? .account : .beginning
                        )
                    }
                }
            }

            if isShowingLaunch {
                BrickValLogoLoader(isHandingOff: launchIsHandingOff)
                    .transition(.opacity)
                    .allowsHitTesting(false)
                    .zIndex(1)
            }
        }
        .task {
            await prepare()
        }
        .task(id: "\(scenePhase)-\(coordinator?.clerk?.user?.id ?? "signed-out")-\(preferences.referralOnboardingCompletionPending)") {
            guard scenePhase == .active,
                  preferences.referralOnboardingCompletionPending,
                  coordinator?.clerk?.user != nil
            else { return }
            do {
                let response = try await api.completeReferralOnboarding()
                preferences.referralOnboardingCompletionPending = false
                monetization.applyReferralStatus(response.referral)
                coordinator?.analytics.capture(
                    PostHogEvent.referralOnboardingCompleted,
                    properties: ["qualified": response.qualified, "reward_granted": response.rewardGranted]
                )
            } catch {
                // Keep the flag set so a later app activation retries the acknowledgement.
            }
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
        async let minimumLaunchDisplay: Void = holdLaunchAnimation()
        await collectionStore.load()
        await migrate()
        await minimumLaunchDisplay
        isReady = true
        await completeLaunch()
    }

    private func holdLaunchAnimation() async {
        guard !reduceMotion else { return }
        try? await Task.sleep(for: .milliseconds(760))
    }

    private func completeLaunch() async {
        guard !reduceMotion, shouldUseScannerHandoff else {
            withAnimation(.timingCurve(0.25, 1, 0.5, 1, duration: 0.2)) {
                isShowingLaunch = false
            }
            return
        }

        // Let the camera session begin while it is still concealed by the launch surface.
        try? await Task.sleep(for: .milliseconds(140))
        launchIsHandingOff = true
        try? await Task.sleep(for: .milliseconds(680))
        isShowingLaunch = false
    }

    private var shouldUseScannerHandoff: Bool {
        preferences.hasCompletedOnboarding &&
            !preferences.isReplayingOnboarding &&
            router.selectedTab == .scan
    }

    private func migrate() async {
        do {
            _ = try await migration.run(collectionStore: collectionStore, preferences: preferences)
            monetization.protectExistingUserIfNeeded(
                hasCompletedOnboarding: preferences.hasCompletedOnboarding
            )
            coordinator?.setMonetizationCohort(monetization.accessCohort)
            await collectionStore.load()
            migrationError = nil
        } catch {
            migrationError = "Brickvalue could not copy your Expo data yet. Nothing was deleted."
        }
    }
}

struct UpdateRequiredView: View {
    let minimumBuild: Int?
    let updateURL: URL

    var body: some View {
        VStack(spacing: 20) {
            Image("OnboardingLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 96, height: 96)
                .clipShape(.rect(cornerRadius: 22))

            VStack(spacing: 8) {
                Text("Update BrickValue")
                    .font(.title2.bold())
                Text(message)
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Link(destination: updateURL) {
                Label("Update now", systemImage: "arrow.down.app.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 54)
            }
            .buttonStyle(.borderedProminent)
            .tint(AccentPreference.green.color)
            .accessibilityIdentifier("appUpdate.open")
        }
        .padding(24)
        .frame(maxWidth: 420)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(BrickValStyle.Primitive.brandInk.ignoresSafeArea())
        .foregroundStyle(.white)
        .preferredColorScheme(.dark)
    }

    private var message: String {
        if let minimumBuild {
            return "This version is no longer supported. Install the latest update to keep scanning and valuing your collection. Build \(minimumBuild) or newer is required."
        }
        return "This version is no longer supported. Install the latest update to keep scanning and valuing your collection."
    }
}

struct BrickValLogoLoader: View {
    let isHandingOff: Bool
    var showsBackground = true
    var showsWordmark = true
    var scale: CGFloat = 1

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hasEntered = false
    @State private var haloExpanded = false
    @State private var wordmarkVisible = false

    var body: some View {
        GeometryReader { proxy in
            ZStack {
                if showsBackground {
                    BrickValStyle.Primitive.brandInk
                        .ignoresSafeArea()
                        .opacity(isHandingOff ? 0 : 1)
                        .animation(
                            .timingCurve(0.25, 1, 0.5, 1, duration: 0.44).delay(0.08),
                            value: isHandingOff
                        )
                }

                Circle()
                    .fill(BrickValStyle.Semantic.builderYellow.opacity(0.16))
                    .frame(width: 184 * scale, height: 184 * scale)
                    .scaleEffect(isHandingOff ? 4.8 : (haloExpanded ? 1.08 : 0.82))
                    .opacity(isHandingOff ? 0 : (haloExpanded ? 0.18 : 0.78))
                    .animation(
                        .timingCurve(0.16, 1, 0.3, 1, duration: 0.58),
                        value: isHandingOff
                    )
                    .accessibilityHidden(true)

                Image(systemName: "viewfinder")
                    .font(.system(size: 148 * scale, weight: .ultraLight))
                    .foregroundStyle(BrickValStyle.Primitive.white.opacity(0.42))
                    .scaleEffect(isHandingOff ? 3.25 : 0.92)
                    .opacity(isHandingOff ? 0 : (hasEntered ? 0.5 : 0))
                    .animation(
                        .timingCurve(0.16, 1, 0.3, 1, duration: 0.62),
                        value: isHandingOff
                    )
                    .accessibilityHidden(true)

                Image("OnboardingLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 132 * scale, height: 132 * scale)
                    .clipShape(RoundedRectangle(cornerRadius: 30 * scale, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: 30 * scale, style: .continuous)
                            .stroke(BrickValStyle.Primitive.white.opacity(0.08), lineWidth: 1)
                    }
                    .shadow(
                        color: BrickValStyle.Primitive.black.opacity(isHandingOff ? 0 : 0.14),
                        radius: 24,
                        y: 12
                    )
                    .scaleEffect(isHandingOff ? 0.2 : (hasEntered ? 1 : 0.84))
                    .rotationEffect(.degrees(hasEntered ? 0 : -2))
                    .offset(y: isHandingOff ? proxy.size.height * 0.42 : 0)
                    .opacity(isHandingOff ? 0 : (hasEntered ? 1 : 0))
                    .animation(
                        .timingCurve(0.22, 1, 0.36, 1, duration: 0.56),
                        value: isHandingOff
                    )
                    .accessibilityLabel("BrickValue")

                if showsWordmark {
                    Text("BrickValue")
                        .font(.system(size: 27 * scale, weight: .bold, design: .rounded))
                        .tracking(-0.6)
                        .foregroundStyle(BrickValStyle.Primitive.white)
                        .offset(y: wordmarkVisible ? 100 * scale : 108 * scale)
                        .opacity(isHandingOff ? 0 : (wordmarkVisible ? 1 : 0))
                        .animation(
                            .timingCurve(0.22, 1, 0.36, 1, duration: 0.38),
                            value: wordmarkVisible
                        )
                        .animation(.easeOut(duration: 0.16), value: isHandingOff)
                        .accessibilityHidden(true)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .preferredColorScheme(.dark)
        .onAppear {
            guard !reduceMotion else {
                hasEntered = true
                haloExpanded = true
                wordmarkVisible = true
                return
            }

            withAnimation(.timingCurve(0.16, 1, 0.3, 1, duration: 0.56)) {
                hasEntered = true
            }
            withAnimation(.easeInOut(duration: 1.15).repeatForever(autoreverses: true)) {
                haloExpanded = true
            }
            withAnimation(.timingCurve(0.22, 1, 0.36, 1, duration: 0.38).delay(0.16)) {
                wordmarkVisible = true
            }
        }
    }
}
