import AVFoundation
import AuthenticationServices
import ClerkKit
import SwiftUI
import UIKit

struct OnboardingView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var step: OnboardingStep = .brand
    @State private var goal: PrimaryGoal?
    @State private var presentedSheet: OnboardingSheet?
    @State private var authenticatingProvider: OnboardingAuthProvider?
    @State private var alertMessage: String?
    private let onFinish: () -> Void

    init(onFinish: @escaping () -> Void = {}) {
        self.onFinish = onFinish
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
                playsVideo: step == .brand || step == .video,
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
                advance: advanceDetailStep
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
                skip: finishOnboarding
            )
            .opacity(step == .account ? 1 : 0)
            .scaleEffect(reduceMotion || step == .account ? 1 : 0.985)
            .allowsHitTesting(step == .account)
            .accessibilityHidden(step != .account)

            OnboardingBrandScreen()
                .opacity(step == .brand ? 1 : 0)
                .scaleEffect(reduceMotion || step == .brand ? 1 : 1.025)
                .allowsHitTesting(step == .brand)
                .accessibilityHidden(step != .brand)
        }
        .preferredColorScheme(.light)
        .interactiveDismissDisabled()
        .task(id: step) {
            guard step == .brand else { return }
            if !reduceMotion {
                try? await Task.sleep(for: .milliseconds(1_050))
            }
            guard !Task.isCancelled else { return }
            withAnimation(reduceMotion ? nil : .timingCurve(0.22, 1, 0.36, 1, duration: 0.48)) {
                step = .video
            }
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
            finishOnboarding()
        }
        .alert("Couldn’t sign in", isPresented: alertBinding) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage ?? "You can continue without an account and sign in later from Profile.")
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
            alertMessage = "Sign-in is unavailable in this build. You can continue and sign in later from Profile."
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
            alertMessage = "Sign-in is unavailable in this build. You can continue and sign in later from Profile."
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
                    finishOnboarding()
                } else {
                    presentedSheet = .auth
                }
            } catch {
                authenticatingProvider = nil
                guard !isAuthenticationCancellation(error) else { return }
                alertMessage = "Sign-in didn’t complete. Check your connection and try again."
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
        preferences.primaryGoal = goal
        preferences.isReplayingOnboarding = false
        preferences.hasCompletedOnboarding = true
        onFinish()
    }
}

private enum OnboardingStep: Int, CaseIterable, Identifiable {
    case brand
    case video
    case value
    case scanReveal
    case goal
    case trust
    case review
    case account

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
        default: nil
        }
    }
}

private enum OnboardingAuthProvider: Hashable {
    case apple
    case google
}

private enum OnboardingSheet: String, Identifiable {
    case auth

    var id: String { rawValue }
}

private struct OnboardingBrandScreen: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var visible = false

    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space16) {
            Image("OnboardingLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 112, height: 112)
                .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))

            Text("BrickValue")
                .font(.system(.largeTitle, design: .rounded, weight: .bold))
                .foregroundStyle(.black)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("BrickValue")
        .accessibilityIdentifier("onboarding.brand")
        .scaleEffect(reduceMotion || visible ? 1 : 0.94)
        .opacity(visible ? 1 : 0)
        .onAppear {
            withAnimation(reduceMotion ? nil : .timingCurve(0.16, 1, 0.3, 1, duration: 0.46)) {
                visible = true
            }
        }
    }
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
            OnboardingReviewScreen()
        default:
            EmptyView()
        }
    }
}

private struct OnboardingProgressBar: View {
    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    let currentIndex: Int
    private let stepCount = 6

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
    let title: String
    let subtitle: String

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
                    Text("Market Value").foregroundStyle(.secondary)
                    Spacer()
                    Text("$214").font(.title.bold()).monospacedDigit()
                }
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
                subtitle: "BrickValue uses data from reliable sources."
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
            }

            Spacer()
        }
        .padding(.horizontal, BrickValStyle.Primitive.space24)
        .padding(.top, BrickValStyle.Primitive.space12)
        .padding(.bottom, BrickValStyle.Primitive.space24)
        .accessibilityIdentifier("onboarding.account")
    }

    private func providerButton(
        title: String,
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
            AsyncImage(url: OAuthProvider.google.iconImageUrl) { phase in
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
        case .catalog: "Catalog my collection"
        case .resell: "Buy and sell LEGO"
        case .dealCheck: "Spot hidden gems"
        }
    }

    var onboardingDetail: String {
        switch self {
        case .catalog: "Track what I own and what it is worth today."
        case .resell: "Check value before I list, buy, or negotiate."
        case .dealCheck: "Scan quickly in stores, markets, or bulk lots."
        }
    }
}
