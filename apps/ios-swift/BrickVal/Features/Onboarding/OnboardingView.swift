import AVFoundation
import SwiftUI
import UIKit

struct OnboardingView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var step: OnboardingStep = .brand
    @State private var presentedSheet: OnboardingSheet?
    @State private var signInUnavailable = false

    var body: some View {
        ZStack {
            Color.white
                .ignoresSafeArea()

            OnboardingDemoScreen(
                getStarted: finishOnboarding,
                signIn: presentSignIn
            )
            .opacity(step == .demo ? 1 : 0)
            .scaleEffect(reduceMotion || step == .demo ? 1 : 0.985)
            .allowsHitTesting(step == .demo)
            .accessibilityHidden(step != .demo)

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
        .alert("Sign-in unavailable", isPresented: $signInUnavailable) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("You can continue without an account and sign in later from Profile.")
        }
    }

    private func presentSignIn() {
        guard coordinator?.clerk != nil else {
            signInUnavailable = true
            return
        }
        presentedSheet = .auth
    }

    private func finishOnboarding() {
        preferences.isReplayingOnboarding = false
        preferences.hasCompletedOnboarding = true
    }
}

private enum OnboardingStep: Hashable {
    case brand
    case demo
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
        let videoHeight = min(400, max(270, availableHeight * 0.48))

        return VStack(spacing: BrickValStyle.Primitive.space16) {
            LoopingOnboardingVideo()
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
                    .accessibilityHint("Continue to BrickValue without signing in")
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

private struct LoopingOnboardingVideo: View {
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
            if phase == .active, !reduceMotion || isPlaying {
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
        guard !reduceMotion else { return }
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
