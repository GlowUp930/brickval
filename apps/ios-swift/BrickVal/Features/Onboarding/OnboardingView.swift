import SwiftUI

struct OnboardingView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var step: OnboardingStep = .value
    @State private var goal: PrimaryGoal?

    var body: some View {
        VStack(spacing: 0) {
            progress
                .padding(.horizontal, BrickValStyle.Primitive.space24)
                .padding(.top, BrickValStyle.Primitive.space12)

            ZStack {
                screen
                    .id(step)
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)
                    ))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            Button(step == .value ? "Get started" : step == .review ? "Start scanning" : "Continue", action: advance)
                .buttonStyle(.borderedProminent)
                .tint(BrickValStyle.Semantic.textPrimary)
                .controlSize(.large)
                .frame(maxWidth: .infinity)
                .padding(BrickValStyle.Primitive.space24)
                .disabled(step == .goal && goal == nil)
        }
        .background(BrickValStyle.Semantic.canvas.ignoresSafeArea())
        .preferredColorScheme(.light)
        .interactiveDismissDisabled()
    }

    private var progress: some View {
        HStack(spacing: BrickValStyle.Primitive.space8) {
            ForEach(OnboardingStep.allCases) { item in
                Capsule()
                    .fill(item.index <= step.index ? accent : BrickValStyle.Semantic.divider)
                    .frame(height: 4)
            }
        }
        .animation(reduceMotion ? nil : .easeOut(duration: 0.28), value: step)
    }

    @ViewBuilder
    private var screen: some View {
        switch step {
        case .value: OnboardingValueScreen()
        case .demo: OnboardingDemoScreen()
        case .goal: OnboardingGoalScreen(selection: $goal)
        case .trust: OnboardingTrustScreen()
        case .review: OnboardingReviewScreen()
        }
    }

    private func advance() {
        if step == .review {
            preferences.primaryGoal = goal
            preferences.isReplayingOnboarding = false
            preferences.hasCompletedOnboarding = true
        } else if let next = OnboardingStep(rawValue: step.rawValue + 1) {
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.28)) { step = next }
        }
    }
}

private enum OnboardingStep: Int, CaseIterable, Identifiable {
    case value, demo, goal, trust, review
    var id: Self { self }
    var index: Int { rawValue }
}

private struct OnboardingHero: View {
    let title: String
    let subtitle: String
    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space8) {
            Text(title).font(.system(size: 29, weight: .bold)).multilineTextAlignment(.center)
            Text(subtitle).font(.subheadline.weight(.medium)).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }
    }
}

private struct OnboardingValueScreen: View {
    @Environment(\.brickValAccent) private var accent

    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space24) {
            OnboardingHero(title: "Know what your LEGO is worth", subtitle: "Scan sets and minifigures, check value, and track your collection.")
            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
                Image("OnboardingR2D2").resizable().scaledToFit().frame(height: 210).frame(maxWidth: .infinity)
                Text("SET").font(.caption.bold()).foregroundStyle(.secondary)
                Text("75308  R2-D2").font(.title2.bold())
                HStack { Text("Market Value").foregroundStyle(.secondary); Spacer(); Text("$214").font(.title.bold()).monospacedDigit() }
                HStack { Spacer(); Text("+24%").font(.headline).foregroundStyle(accent).monospacedDigit() }
            }
            .padding()
            .background(.white, in: .rect(cornerRadius: 22))
            .overlay { RoundedRectangle(cornerRadius: 22).stroke(BrickValStyle.Semantic.divider) }
        }
        .padding(BrickValStyle.Primitive.space24)
    }
}

private struct OnboardingDemoScreen: View {
    @Environment(\.brickValAccent) private var accent
    @State private var scanning = false
    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space24) {
            OnboardingHero(title: "Scan. Confirm. Reveal.", subtitle: "BrickVal gets from camera to market value in seconds.")
            ZStack {
                RoundedRectangle(cornerRadius: 36).fill(BrickValStyle.Primitive.gray900)
                Image(systemName: "viewfinder").font(.system(size: 150, weight: .ultraLight)).foregroundStyle(.white.opacity(0.8))
                Capsule().fill(accent).frame(height: 3).padding(.horizontal, 28)
                    .offset(y: scanning ? 120 : -120)
            }
            .frame(maxWidth: 270, maxHeight: 430)
            .onAppear { withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true)) { scanning = true } }
        }
        .padding(BrickValStyle.Primitive.space24)
    }
}

private struct OnboardingGoalScreen: View {
    @Environment(\.brickValAccent) private var accent
    @Binding var selection: PrimaryGoal?
    var body: some View {
        VStack(spacing: BrickValStyle.Primitive.space24) {
            OnboardingHero(title: "What are you mainly here to do?", subtitle: "Pick one. This helps BrickVal guide your first scan.")
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
                        .padding().background(.white, in: .rect(cornerRadius: 16))
                        .overlay { RoundedRectangle(cornerRadius: 16).stroke(selection == goal ? accent : BrickValStyle.Semantic.divider) }
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
            OnboardingHero(title: "Real Market Data", subtitle: "BrickVal uses data from reliable sources.")
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
                Image("OnboardingShield").resizable().scaledToFit().frame(width: 110)
                    .scaleEffect(isAnimating ? 1.02 : 1)
                Image("OnboardingBrickLink").resizable().scaledToFit().frame(width: 130).offset(x: -85, y: -105)
                    .scaleEffect(isAnimating ? 1.03 : 1)
                Image("OnboardingBrickset").resizable().scaledToFit().frame(width: 115).offset(x: 95, y: 105)
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
            OnboardingHero(title: "Built by a LEGO fan", subtitle: "BrickVal is an independent app made for collectors.")
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
                .font(.body.weight(.medium)).foregroundStyle(.secondary).multilineTextAlignment(.center)
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

private extension PrimaryGoal {
    var onboardingTitle: String {
        switch self { case .catalog: "Catalog my collection"; case .resell: "Buy and sell LEGO"; case .dealCheck: "Spot hidden gems" }
    }
    var onboardingDetail: String {
        switch self {
        case .catalog: "Track what I own and what it is worth today."
        case .resell: "Check value before I list, buy, or negotiate."
        case .dealCheck: "Scan quickly in stores, markets, or bulk lots."
        }
    }
}
