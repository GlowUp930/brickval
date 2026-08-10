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
    @State private var presentedSheet: OnboardingSheet?
    @State private var authenticatingProvider: OnboardingAuthProvider?
    @State private var alertMessage: String?

    init() {
#if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-showOnboardingAccountDemo") {
            _step = State(initialValue: .account)
        }
#endif
    }

    var body: some View {
        ZStack {
            Color.white
                .ignoresSafeArea()

            OnboardingDemoScreen(
                playsVideo: step != .account,
                getStarted: showAccountStep,
                signIn: presentSignIn
            )
            .opacity(step == .demo ? 1 : 0)
            .scaleEffect(reduceMotion || step == .demo ? 1 : 0.985)
            .allowsHitTesting(step == .demo)
            .accessibilityHidden(step != .demo)

            OnboardingAccountScreen(
                authenticatingProvider: authenticatingProvider,
                back: showDemoStep,
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
                step = .demo
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

    private func showAccountStep() {
        withAnimation(reduceMotion ? nil : .timingCurve(0.22, 1, 0.36, 1, duration: 0.42)) {
            step = .account
        }
    }

    private func showDemoStep() {
        withAnimation(reduceMotion ? nil : .timingCurve(0.22, 1, 0.36, 1, duration: 0.38)) {
            step = .demo
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
        preferences.isReplayingOnboarding = false
        preferences.hasCompletedOnboarding = true
    }
}

private enum OnboardingStep: Hashable {
    case brand
    case demo
    case account
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
        let videoHeight = min(450, max(340, availableHeight * 0.55))

        return VStack(spacing: BrickValStyle.Primitive.space16) {
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
                .font(.system(.largeTitle, design: .rounded, weight: .bold))
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

                Capsule()
                    .fill(Color.black)
                    .frame(height: 4)
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
