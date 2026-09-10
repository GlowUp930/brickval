import AVFoundation
import AuthenticationServices
import ClerkKit
import SwiftUI
import UIKit

enum OnboardingEntryPoint {
    case beginning
    case account
}

struct OnboardingView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(MonetizationStore.self) private var monetization
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.brickValAPIClient) private var api
    @Environment(AppRouter.self) private var router
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.requestReview) private var requestReview
    @State private var step: OnboardingStep = .video
    @State private var goal: PrimaryGoal?
    @State private var presentedSheet: OnboardingSheet?
    @State private var authenticatingProvider: OnboardingAuthProvider?
    @State private var alertMessage: String?
    @State private var didCaptureAnalytics = false
    @State private var referralCode = ""
    @State private var referralMessage: String?
    @State private var isClaimingReferral = false
    @State private var didFinishOnboarding = false
    @State private var didRequestOnboardingReview = false
    private let onFinish: () -> Void

    init(
        entryPoint: OnboardingEntryPoint = .beginning,
        onFinish: @escaping () -> Void = {}
    ) {
        self.onFinish = onFinish
        _step = State(initialValue: entryPoint == .account ? .account : .video)
#if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-showOnboardingAccountDemo") {
            _step = State(initialValue: .account)
        } else if ProcessInfo.processInfo.arguments.contains("-showOnboardingDetailsDemo") {
            _step = State(initialValue: .value)
        }
#endif
    }

    var body: some View {
        ZStack {
            Color.white
                .ignoresSafeArea()

            OnboardingDemoScreen(
                playsVideo: step == .video,
                getStarted: showValueStep,
                signIn: presentSignIn
            )
            .opacity(step == .video ? 1 : 0)
            .scaleEffect(reduceMotion || step == .video ? 1 : 0.985)
            .allowsHitTesting(step == .video)
            .accessibilityHidden(step != .video)

            OnboardingDetailSequence(
                step: step,
                goal: $goal,
                advance: advanceDetailStep,
                leaveReview: leaveReview
            )
            .opacity(step.isDetailStep ? 1 : 0)
            .scaleEffect(reduceMotion || step.isDetailStep ? 1 : 0.985)
            .allowsHitTesting(step.isDetailStep)
            .accessibilityHidden(!step.isDetailStep)

            OnboardingAccountScreen(
                authenticatingProvider: authenticatingProvider,
                back: showReviewStep,
                signInWithApple: { authenticate(with: .apple) },
                signInWithGoogle: { authenticate(with: .google) },
                skip: continueFromAccount
            )
            .opacity(step == .account ? 1 : 0)
            .scaleEffect(reduceMotion || step == .account ? 1 : 0.985)
            .allowsHitTesting(step == .account)
            .accessibilityHidden(step != .account)

            OnboardingReferralScreen(
                code: $referralCode,
                message: referralMessage,
                isClaiming: isClaimingReferral,
                isSignedIn: coordinator?.clerk?.user != nil,
                isPreview: false,
                back: showAccountStep,
                apply: applyReferralCode,
                signIn: presentSignIn,
                skip: finishOnboarding
            )
            .opacity(step == .referral ? 1 : 0)
            .scaleEffect(reduceMotion || step == .referral ? 1 : 0.985)
            .allowsHitTesting(step == .referral)
            .accessibilityHidden(step != .referral)

        }
        .preferredColorScheme(.light)
        .interactiveDismissDisabled()
        .onAppear {
            guard !didCaptureAnalytics else { return }
            didCaptureAnalytics = true
            coordinator?.analytics.capture(
                PostHogEvent.onboardingStarted,
                properties: ["is_replay": preferences.isReplayingOnboarding]
            )
        }
        .sheet(item: $presentedSheet) { sheet in
            switch sheet {
            case .auth:
                if let clerk = coordinator?.clerk {
                    BrickValueAuthView(isDismissible: true)
                        .environment(clerk)
                }
            }
        }
        .onChange(of: presentedSheet) { previous, current in
            guard previous == .auth, current == nil, coordinator?.clerk?.user != nil else { return }
            if step == .referral, referralCode.count == 8 {
                Task { await claimReferralCode() }
            } else {
                continueFromAccount()
            }
        }
        .onChange(of: router.pendingReferralCode) { _, newCode in
            guard let newCode, step == .referral else { return }
            referralCode = newCode
        }
        .onChange(of: step) { _, newStep in
            guard newStep == .review else { return }
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(420))
                guard !Task.isCancelled, step == .review else { return }
                requestOnboardingReview()
            }
        }
        .task(id: step) {
            guard step == .referral else { return }
            if let pendingReferralCode = router.pendingReferralCode {
                referralCode = pendingReferralCode
            }
        }
        .alert("Couldn’t sign in", isPresented: alertBinding) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage ?? BrickValLocalization.localized("You can continue without an account and sign in later from Profile."))
        }
    }

    private var alertBinding: Binding<Bool> {
        Binding(
            get: { alertMessage != nil },
            set: { if !$0 { alertMessage = nil } }
        )
    }

    private func presentSignIn() {
        guard coordinator?.clerk != nil else {
            alertMessage = BrickValLocalization.localized("Sign-in is unavailable in this build. You can continue and sign in later from Profile.")
            return
        }
        presentedSheet = .auth
    }

    private func showValueStep() {
        withAnimation(reduceMotion ? nil : .timingCurve(0.22, 1, 0.36, 1, duration: 0.42)) {
            step = .value
        }
    }

    private func showReviewStep() {
        withAnimation(reduceMotion ? nil : .timingCurve(0.22, 1, 0.36, 1, duration: 0.38)) {
            step = .review
        }
    }

    private func showAccountStep() {
        withAnimation(reduceMotion ? nil : .timingCurve(0.22, 1, 0.36, 1, duration: 0.38)) {
            step = .account
        }
    }

    private func requestOnboardingReview() {
        guard !didRequestOnboardingReview, !preferences.hasRequestedReview else { return }
        didRequestOnboardingReview = true
        preferences.hasRequestedReview = true
        requestReview()
    }

    private func leaveReview() {
        requestReview()
    }

    private func continueFromAccount() {
        guard !preferences.isReplayingOnboarding else {
            finishOnboarding()
            return
        }
        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.28)) {
            step = .referral
        }
    }

    private func advanceDetailStep() {
        let nextStep: OnboardingStep? = switch step {
        case .value: .scanReveal
        case .scanReveal: .goal
        case .goal: .trust
        case .trust: .review
        case .review: .account
        default: nil
        }
        guard let nextStep else { return }
        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.28)) {
            step = nextStep
        }
    }

    private func authenticate(with provider: OnboardingAuthProvider) {
        guard let clerk = coordinator?.clerk else {
            alertMessage = BrickValLocalization.localized("Sign-in is unavailable in this build. You can continue and sign in later from Profile.")
            return
        }

        authenticatingProvider = provider
        Task {
            do {
                switch provider {
                case .apple:
                    _ = try await clerk.auth.signInWithApple()
                case .google:
                    _ = try await clerk.auth.signInWithOAuth(provider: .google)
                }
                authenticatingProvider = nil
                if clerk.user != nil {
                    coordinator?.analytics.capture(
                        PostHogEvent.signInCompleted,
                        properties: ["provider": provider.rawValue]
                    )
                    continueFromAccount()
                } else {
                    presentedSheet = .auth
                }
            } catch {
                authenticatingProvider = nil
                guard !isAuthenticationCancellation(error) else { return }
                alertMessage = BrickValLocalization.localized("Sign-in didn’t complete. Check your connection and try again.")
            }
        }
    }

    private func isAuthenticationCancellation(_ error: Error) -> Bool {
        if let error = error as? ASAuthorizationError {
            return error.code == .canceled
        }
        if let error = error as? ASWebAuthenticationSessionError {
            return error.code == .canceledLogin
        }
        return false
    }

    private func finishOnboarding() {
        guard !didFinishOnboarding else { return }
        didFinishOnboarding = true

        let isReplay = preferences.isReplayingOnboarding
        preferences.primaryGoal = goal
        preferences.isReplayingOnboarding = false
        preferences.shouldReturnToOnboardingAccount = false
        preferences.hasCompletedOnboarding = true
        if !isReplay {
            monetization.enrollNewUserIfNeeded(seed: coordinator?.superwallSeed)
        }
        coordinator?.setMonetizationCohort(monetization.accessCohort)
        coordinator?.analytics.capture(
            PostHogEvent.onboardingCompleted,
            properties: [
                "signed_in": coordinator?.clerk?.user != nil,
                "goal": goal?.rawValue ?? "not_set",
            ]
        )
        if !isReplay, coordinator?.clerk?.user != nil {
            preferences.referralCompletionUserID = coordinator?.clerk?.user?.id
            preferences.referralOnboardingCompletionPending = true
            Task { await completeReferralOnboardingIfPossible() }
        }
        onFinish()
    }

    private func applyReferralCode() {
        guard referralCode.count == 8 else {
            referralMessage = BrickValLocalization.localized("Enter the 8-character invite code.")
            return
        }
        guard coordinator?.clerk?.user != nil else {
            referralMessage = BrickValLocalization.localized("Sign in to apply your invite code.")
            presentSignIn()
            return
        }
        Task { await claimReferralCode() }
    }

    private func claimReferralCode() async {
        let normalizedCode = referralCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard normalizedCode.count == 8 else { return }
        router.pendingReferralCode = normalizedCode
        isClaimingReferral = true
        referralMessage = nil
        coordinator?.analytics.capture(PostHogEvent.referralClaimAttempted, properties: ["source": "onboarding"])
        defer { isClaimingReferral = false }

        do {
            let response = try await api.claimReferralCode(
                normalizedCode,
                InstallationIdentity.current()
            )
            guard response.claimed || ["claimed", "qualified", "already_claimed"].contains(response.status) else {
                referralMessage = BrickValLocalization.localized("That invite code could not be claimed.")
                return
            }
            monetization.applyReferralStatus(response.referral)
            router.clearPendingReferral()
            coordinator?.analytics.capture(PostHogEvent.referralClaimed, properties: ["source": "onboarding"])
            finishOnboarding()
        } catch let error as APIError where error.statusCode == 422 || error.statusCode == 409 {
            referralMessage = error.localizedDescription
        } catch {
            referralMessage = BrickValLocalization.localized("We couldn't apply the invite code. You can skip and try again from Profile.")
        }
    }

    private func completeReferralOnboardingIfPossible() async {
        guard coordinator?.clerk?.user != nil else { return }
        do {
            let response = try await api.completeReferralOnboarding()
            preferences.referralOnboardingCompletionPending = false
            monetization.applyReferralStatus(response.referral)
            coordinator?.analytics.capture(
                PostHogEvent.referralOnboardingCompleted,
                properties: ["qualified": response.qualified, "reward_granted": response.rewardGranted]
            )
        } catch {
            // The pending flag is retried on the next signed-in app activation.
        }
    }
}

private enum OnboardingStep: Int, CaseIterable, Identifiable {
    case video
    case value
    case scanReveal
    case goal
    case trust
    case review
    case account
    case referral

    var id: Self { self }

    var isDetailStep: Bool {
        switch self {
        case .value, .scanReveal, .goal, .trust, .review: true
        default: false
        }
    }

    var progressIndex: Int? {
        switch self {
        case .value: 0
        case .scanReveal: 1
        case .goal: 2
        case .trust: 3
        case .review: 4
        case .account: 5
        case .referral: 6
        default: nil
        }
    }
}

private enum OnboardingAuthProvider: String, Hashable {
    case apple
    case google
}

private enum OnboardingSheet: String, Identifiable {
    case auth

    var id: String { rawValue }
}

private struct OnboardingDemoScreen: View {
    let playsVideo: Bool
    let getStarted: () -> Void
    let signIn: () -> Void

    var body: some View {
        GeometryReader { proxy in
            ScrollView {
                content(availableHeight: proxy.size.height)
            }
            .scrollIndicators(.hidden)
        }
    }

    private func content(availableHeight: CGFloat) -> some View {
        let videoHeight = min(500, max(380, availableHeight * 0.61))
        let topSpacing = availableHeight >= 760
            ? min(44, availableHeight * 0.05)
            : 0

        return VStack(spacing: BrickValStyle.Primitive.space16) {
            Spacer(minLength: topSpacing)
                .frame(height: topSpacing)

            LoopingOnboardingVideo(isActive: playsVideo)
                .frame(width: videoHeight * (480.0 / 810.0), height: videoHeight)
                .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 30, style: .continuous)
                        .stroke(Color.primary.opacity(0.10), lineWidth: 1)
                }
                .shadow(color: .black.opacity(0.10), radius: 20, y: 10)
                .accessibilityIdentifier("onboarding.video")

            Text("LEGO collecting\nmade easy")
                .font(.system(.title, design: .rounded, weight: .bold))
                .foregroundStyle(.black)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)

            Spacer(minLength: 0)

            VStack(spacing: 2) {
                Button("Get Started", action: getStarted)
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .background(Color.black, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .accessibilityHint("Continue to account options")
                    .accessibilityIdentifier("onboarding.getStarted")

                Button(action: signIn) {
                    HStack(spacing: 3) {
                        Text("Already have an account?")
                            .foregroundStyle(.secondary)
                        Text("Sign In")
                            .fontWeight(.semibold)
                            .foregroundStyle(.black)
                    }
                }
                .buttonStyle(.plain)
                .tint(.black)
                .font(.subheadline)
                .frame(minHeight: 44)
                .accessibilityLabel("Already have an account? Sign in")
                .accessibilityHint("Opens email, Apple, and Google sign-in options")
                .accessibilityIdentifier("onboarding.signIn")
            }
        }
        .padding(.horizontal, BrickValStyle.Primitive.space24)
        .padding(.top, BrickValStyle.Primitive.space12)
        .padding(.bottom, BrickValStyle.Primitive.space8)
        .frame(maxWidth: .infinity, minHeight: availableHeight)
    }
}

private struct OnboardingDetailSequence: View {
    let step: OnboardingStep
    @Binding var goal: PrimaryGoal?
    let advance: () -> Void
    let leaveReview: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            OnboardingProgressBar(currentIndex: step.progressIndex ?? 0)
                .padding(.horizontal, BrickValStyle.Primitive.space24)
                .padding(.top, BrickValStyle.Primitive.space12)

            ZStack {
                detailScreen
                    .id(step)
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)
                    ))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            Button(step == .review ? "Continue" : "Next", action: advance)
                .buttonStyle(.borderedProminent)
                .tint(BrickValStyle.Semantic.textPrimary)
                .controlSize(.large)
                .frame(maxWidth: .infinity)
                .padding(BrickValStyle.Primitive.space24)
                .disabled(step == .goal && goal == nil)
                .accessibilityIdentifier("onboarding.detailContinue")
        }
    }

    @ViewBuilder
    private var detailScreen: some View {
        switch step {
        case .value:
            OnboardingValueScreen()
        case .scanReveal:
            OnboardingScanRevealScreen()
        case .goal:
            OnboardingGoalScreen(selection: $goal)
        case .trust:
            OnboardingTrustScreen()
        case .review:
            OnboardingReviewScreen(leaveReview: leaveReview)
        default:
            EmptyView()
        }
    }
}

private struct OnboardingProgressBar: View {
    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let currentIndex: Int
    private let stepCount = 7

    var body: some View {
        HStack(spacing: BrickValStyle.Primitive.space8) {
            ForEach(0..<stepCount, id: \.self) { index in
                Capsule()
                    .fill(index <= currentIndex ? accent : BrickValStyle.Semantic.divider)
                    .frame(height: 4)
            }
        }
        .animation(reduceMotion ? nil : .easeOut(duration: 0.28), value: currentIndex)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Onboarding progress")
        .accessibilityValue("Step \(currentIndex + 1) of \(stepCount)")
    }
}

private struct OnboardingHero: View {
    let title: LocalizedStringResource
    let subtitle: LocalizedStringResource

    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space8) {
            Text(title)
                .font(.system(size: 29, weight: .bold))
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .layoutPriority(1)
            Text(subtitle)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

private struct OnboardingValueScreen: View {
    @Environment(\.brickValAccent) private var accent

    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space24) {
            OnboardingHero(
                title: "Know what your LEGO is worth",
                subtitle: "Scan sets and minifigures, check value, and track your collection."
            )
            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
                Image("OnboardingR2D2")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 210)
                    .frame(maxWidth: .infinity)
                Text("SET").font(.caption.bold()).foregroundStyle(.secondary)
                Text("75308  R2-D2").font(.title2.bold())
                HStack {
                    Text("Average market price").foregroundStyle(.secondary)
                    Spacer()
                    BrickValCurrencyText(214)
                        .font(.title.bold())
                        .monospacedDigit()
                }
                Text("We use the average of recent sold prices. If sold data isn't available, we clearly label the average asking price from active listings.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                HStack {
                    Spacer()
                    Text("+24%").font(.headline).foregroundStyle(accent).monospacedDigit()
                }
            }
            .padding()
            .background(.white, in: .rect(cornerRadius: 22))
            .overlay { RoundedRectangle(cornerRadius: 22).stroke(BrickValStyle.Semantic.divider) }
        }
        .padding(BrickValStyle.Primitive.space24)
    }
}

private struct OnboardingScanRevealScreen: View {
    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var scanning = false

    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space24) {
            OnboardingHero(
                title: "Scan. Confirm. Reveal.",
                subtitle: "BrickValue gets from camera to market value in seconds."
            )
            ZStack {
                RoundedRectangle(cornerRadius: 36).fill(BrickValStyle.Primitive.gray900)
                Image(systemName: "viewfinder")
                    .font(.system(size: 150, weight: .ultraLight))
                    .foregroundStyle(.white.opacity(0.8))
                Capsule()
                    .fill(accent)
                    .frame(height: 3)
                    .padding(.horizontal, 28)
                    .offset(y: scanning ? 120 : -120)
            }
            .frame(maxWidth: 270, maxHeight: 430)
        }
        .padding(BrickValStyle.Primitive.space24)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true)) {
                scanning = true
            }
        }
    }
}

private struct OnboardingGoalScreen: View {
    @Environment(\.brickValAccent) private var accent
    @Binding var selection: PrimaryGoal?

    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space24) {
            OnboardingHero(
                title: "What are you mainly here to do?",
                subtitle: "Pick one. This helps BrickValue guide your first scan."
            )
            VStack(spacing: BrickValStyle.Primitive.space12) {
                ForEach(PrimaryGoal.allCases) { goal in
                    Button { selection = goal } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(goal.onboardingTitle).font(.headline)
                                Text(goal.onboardingDetail).font(.subheadline).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: selection == goal ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(selection == goal ? accent : .secondary)
                        }
                        .padding()
                        .background(.white, in: .rect(cornerRadius: 16))
                        .overlay {
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(selection == goal ? accent : BrickValStyle.Semantic.divider)
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("onboarding.goal.\(goal.rawValue)")
                }
            }
        }
        .padding(BrickValStyle.Primitive.space24)
    }
}

private struct OnboardingTrustScreen: View {
    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isAnimating = false

    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space32) {
            OnboardingHero(
                title: "Real Market Data",
                subtitle: "We use the average of recent sold prices. If sold data isn't available, we clearly label the average asking price from active listings."
            )
            ZStack {
                Circle()
                    .stroke(BrickValStyle.Semantic.divider, lineWidth: 2)
                    .frame(width: 250, height: 250)
                    .scaleEffect(isAnimating ? 1.04 : 0.96)
                    .opacity(isAnimating ? 0.7 : 1)
                Circle()
                    .fill(accent.opacity(isAnimating ? 0.14 : 0.08))
                    .frame(width: 172, height: 172)
                    .scaleEffect(isAnimating ? 1.06 : 0.94)
                Image("OnboardingShield")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 110)
                    .scaleEffect(isAnimating ? 1.02 : 1)
                Image("OnboardingBrickLink")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 130)
                    .offset(x: -85, y: -105)
                    .scaleEffect(isAnimating ? 1.03 : 1)
                Image("OnboardingBrickset")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 115)
                    .offset(x: 95, y: 105)
                    .scaleEffect(isAnimating ? 1.03 : 1)
            }
        }
        .padding(BrickValStyle.Primitive.space24)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.8).repeatForever(autoreverses: true)) {
                isAnimating = true
            }
        }
    }
}

private struct OnboardingReviewScreen: View {
    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let leaveReview: () -> Void
    @State private var isAnimating = false

    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space24) {
            OnboardingHero(
                title: "Built by a LEGO fan",
                subtitle: "BrickValue is an independent app made for collectors."
            )
            ZStack {
                Circle()
                    .stroke(BrickValStyle.Semantic.divider, lineWidth: 24)
                    .frame(width: 150, height: 150)
                    .scaleEffect(isAnimating ? 1.05 : 0.92)
                    .opacity(isAnimating ? 0.55 : 0.95)
                Circle()
                    .fill(accent.opacity(isAnimating ? 0.16 : 0.08))
                    .frame(width: 136, height: 136)
                    .scaleEffect(isAnimating ? 1.08 : 0.96)
                Image("OnboardingLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 92, height: 92)
                    .clipShape(.circle)
                    .scaleEffect(isAnimating ? 1.02 : 1)
            }
            .frame(width: 172, height: 172)
            Text("★★★★★").font(.title).foregroundStyle(accent)
            Text("Your feedback helps more LEGO collectors find the app and helps us improve it.")
                .font(.body.weight(.medium))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button(action: leaveReview) {
                Label("Leave a review", systemImage: "star.bubble")
                    .font(.headline.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: 50)
                    .background(accent.opacity(0.14), in: Capsule())
            }
            .buttonStyle(.plain)
            .foregroundStyle(.primary)
            .accessibilityHint("Opens Apple's review prompt when available")
            .accessibilityIdentifier("onboarding.leaveReview")
        }
        .padding(BrickValStyle.Primitive.space24)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.7).repeatForever(autoreverses: true)) {
                isAnimating = true
            }
        }
    }
}

private struct OnboardingAccountScreen: View {
    @Environment(\.appSDKCoordinator) private var coordinator
    let authenticatingProvider: OnboardingAuthProvider?
    let back: () -> Void
    let signInWithApple: () -> Void
    let signInWithGoogle: () -> Void
    let skip: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
            HStack(spacing: BrickValStyle.Primitive.space16) {
                Button(action: back) {
                    Image(systemName: "chevron.left")
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(.black)
                        .frame(width: 44, height: 44)
                        .background(Color(uiColor: .secondarySystemBackground), in: Circle())
                }
                .accessibilityLabel("Back to introduction")

                OnboardingProgressBar(currentIndex: OnboardingStep.account.progressIndex ?? 5)
            }

            Text("Save your progress")
                .font(.system(.largeTitle, design: .rounded, weight: .bold))
                .foregroundStyle(.black)
                .accessibilityAddTraits(.isHeader)

            Spacer()

            VStack(spacing: BrickValStyle.Primitive.space12) {
                providerButton(
                    title: "Sign in with Apple",
                    provider: .apple,
                    foreground: .white,
                    background: .black,
                    border: .clear,
                    action: signInWithApple
                )

                providerButton(
                    title: "Sign in with Google",
                    provider: .google,
                    foreground: .black,
                    background: .white,
                    border: .black,
                    action: signInWithGoogle
                )

                Button(action: skip) {
                    HStack(spacing: 4) {
                        Text("Want to sign in later?")
                            .foregroundStyle(.secondary)
                        Text("Skip for now")
                            .fontWeight(.semibold)
                            .foregroundStyle(.black)
                            .underline()
                    }
                }
                .buttonStyle(.plain)
                .font(.subheadline)
                .frame(minHeight: 44)
                .accessibilityLabel("Skip sign-in for now")
                .accessibilityHint("Opens BrickValue without an account")
                .accessibilityIdentifier("onboarding.account.skip")
            }

            Spacer()
        }
        .padding(.horizontal, BrickValStyle.Primitive.space24)
        .padding(.top, BrickValStyle.Primitive.space12)
        .padding(.bottom, BrickValStyle.Primitive.space24)
    }

    private func providerButton(
        title: LocalizedStringResource,
        provider: OnboardingAuthProvider,
        foreground: Color,
        background: Color,
        border: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: BrickValStyle.Primitive.space12) {
                providerIcon(provider)
                    .frame(width: 26, height: 26)

                Text(title)
                    .font(.headline.weight(.semibold))

                Spacer(minLength: 0)
            }
            .foregroundStyle(foreground)
            .padding(.horizontal, BrickValStyle.Primitive.space24)
            .frame(maxWidth: .infinity, minHeight: 58)
            .background(background, in: Capsule())
            .overlay {
                Capsule().stroke(border, lineWidth: 1.5)
            }
            .overlay {
                if authenticatingProvider == provider {
                    ProgressView()
                        .tint(foreground)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(background.opacity(0.94), in: Capsule())
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(authenticatingProvider != nil)
        .accessibilityIdentifier("onboarding.\(provider == .apple ? "apple" : "google")")
    }

    @ViewBuilder
    private func providerIcon(_ provider: OnboardingAuthProvider) -> some View {
        switch provider {
        case .apple:
            Image(systemName: "apple.logo")
                .font(.title2)
                .accessibilityHidden(true)
        case .google:
            AsyncImage(url: coordinator?.clerk?.publishableKey.isEmpty == false ? OAuthProvider.google.iconImageUrl : nil) { phase in
                if case .success(let image) = phase {
                    image.resizable().scaledToFit()
                } else {
                    Text("G")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.blue, .red, .yellow, .green],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                }
            }
            .accessibilityHidden(true)
        }
    }
}

private struct OnboardingReferralScreen: View {
    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Binding var code: String
    let message: String?
    let isClaiming: Bool
    let isSignedIn: Bool
    let isPreview: Bool
    let back: () -> Void
    let apply: () -> Void
    let signIn: () -> Void
    let skip: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
            HStack(spacing: BrickValStyle.Primitive.space16) {
                Button(action: back) {
                    Image(systemName: "chevron.left")
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(.black)
                        .frame(width: 44, height: 44)
                        .background(Color(uiColor: .secondarySystemBackground), in: Circle())
                }
                .accessibilityLabel("Back to account setup")

                OnboardingProgressBar(currentIndex: OnboardingStep.referral.progressIndex ?? 6)
            }

            Text("Have an invite code?")
                .font(.system(.largeTitle, design: .rounded, weight: .bold))
                .foregroundStyle(.black)
                .accessibilityAddTraits(.isHeader)

            Text("Enter a friend's code to support their BrickValue rewards. You can also skip this step.")
                .font(.body)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: 12)

            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
                TextField("8-character code", text: $code)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .font(.title3.weight(.semibold).monospaced())
                    .padding(.horizontal, 16)
                    .frame(minHeight: 56)
                    .background(.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(code.isEmpty ? Color.black.opacity(0.12) : accent, lineWidth: 1.5)
                    }
                    .onChange(of: code) { _, newValue in
                        code = String(newValue.uppercased().filter { $0.isLetter || $0.isNumber }.prefix(8))
                    }

                if let message {
                    Text(message)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                        .transition(reduceMotion ? .opacity : .move(edge: .top).combined(with: .opacity))
                }

                Button(action: apply) {
                    HStack {
                        if isClaiming {
                            ProgressView().tint(.white)
                        } else {
                            Text(isPreview ? "Preview code" : (isSignedIn ? "Apply code" : "Sign in to apply"))
                                .font(.headline.weight(.semibold))
                        }
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .background(accent, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .disabled(isClaiming || code.count != 8)
                .accessibilityHint(
                    isPreview
                        ? "Shows that invite codes are disabled in preview"
                        : (isSignedIn ? "Attaches this invite to your account" : "Opens sign-in before applying the invite")
                )

                Button("Skip", action: skip)
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.black)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .accessibilityIdentifier("onboarding.referral.skip")
            }

            Spacer()
        }
        .padding(.horizontal, BrickValStyle.Primitive.space24)
        .padding(.top, BrickValStyle.Primitive.space12)
        .padding(.bottom, BrickValStyle.Primitive.space24)
    }
}

private struct LoopingOnboardingVideo: View {
    let isActive: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase
    @State private var player = AVQueuePlayer()
    @State private var looper: AVPlayerLooper?
    @State private var isPlaying = false
    @State private var failedToLoad = false

    var body: some View {
        ZStack {
            BrickValStyle.Primitive.black

            if failedToLoad {
                ContentUnavailableView(
                    "Demo unavailable",
                    systemImage: "play.slash",
                    description: Text("You can continue into BrickValue.")
                )
                .foregroundStyle(.white)
            } else {
                OnboardingPlayerLayer(player: player)

                if reduceMotion && !isPlaying {
                    Button("Play demo", systemImage: "play.fill") {
                        isPlaying = true
                        player.play()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.white)
                    .foregroundStyle(.black)
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("BrickValue scanning demonstration")
        .task {
            configurePlayer()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active, isActive, (!reduceMotion || isPlaying) {
                player.play()
            } else {
                player.pause()
            }
        }
        .onChange(of: isActive) { _, active in
            if active, scenePhase == .active, (!reduceMotion || isPlaying) {
                player.play()
            } else {
                player.pause()
            }
        }
        .onDisappear {
            player.pause()
        }
    }

    private func configurePlayer() {
        guard looper == nil else { return }
        guard let url = Bundle.main.url(forResource: "OnboardingDemo", withExtension: "mp4") else {
            failedToLoad = true
            return
        }

        player.isMuted = true
        looper = AVPlayerLooper(player: player, templateItem: AVPlayerItem(url: url))
        guard !reduceMotion, isActive else { return }
        isPlaying = true
        player.play()
    }
}

private struct OnboardingPlayerLayer: UIViewRepresentable {
    let player: AVPlayer

    func makeUIView(context: Context) -> PlayerLayerView {
        let view = PlayerLayerView()
        view.playerLayer.player = player
        view.playerLayer.videoGravity = .resizeAspectFill
        return view
    }

    func updateUIView(_ view: PlayerLayerView, context: Context) {
        view.playerLayer.player = player
    }
}

private final class PlayerLayerView: UIView {
    override class var layerClass: AnyClass { AVPlayerLayer.self }

    var playerLayer: AVPlayerLayer {
        layer as! AVPlayerLayer
    }
}

private extension PrimaryGoal {
    var onboardingTitle: String {
        switch self {
        case .catalog: BrickValLocalization.localized("Catalog my collection")
        case .resell: BrickValLocalization.localized("Buy and sell LEGO")
        case .dealCheck: BrickValLocalization.localized("Spot hidden gems")
        }
    }

    var onboardingDetail: String {
        switch self {
        case .catalog: BrickValLocalization.localized("Track what I own and what it is worth today.")
        case .resell: BrickValLocalization.localized("Check value before I list, buy, or negotiate.")
        case .dealCheck: BrickValLocalization.localized("Scan quickly in stores, markets, or bulk lots.")
        }
    }
}
