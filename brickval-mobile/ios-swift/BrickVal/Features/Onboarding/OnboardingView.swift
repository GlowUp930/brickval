import SwiftUI

struct OnboardingView: View {
    @Environment(PreferencesStore.self) private var preferences
    @State private var page = 0
    @State private var goal: PrimaryGoal?

    private var finalPage: Int { OnboardingPage.pages.count }

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $page) {
                ForEach(OnboardingPage.pages) { item in
                    OnboardingPageView(page: item).tag(item.id)
                }
                OnboardingGoalView(selection: $goal).tag(finalPage)
            }
            .tabViewStyle(.page(indexDisplayMode: .always))

            Button(page == finalPage ? "Start scanning" : "Continue", action: advance)
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .frame(maxWidth: .infinity)
                .padding()
                .disabled(page == finalPage && goal == nil)
        }
        .interactiveDismissDisabled()
    }

    private func advance() {
        if page < finalPage {
            withAnimation { page += 1 }
        } else {
            preferences.primaryGoal = goal
            preferences.hasCompletedOnboarding = true
        }
    }
}

#Preview {
    OnboardingView()
        .environment(PreferencesStore())
}
