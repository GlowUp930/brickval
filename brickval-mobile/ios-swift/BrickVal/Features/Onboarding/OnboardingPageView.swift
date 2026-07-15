import SwiftUI

struct OnboardingPageView: View {
    let page: OnboardingPage

    var body: some View {
        VStack(spacing: BrickValStyle.sectionSpacing) {
            Image(systemName: page.systemImage)
                .font(.system(.largeTitle, design: .rounded).bold())
                .foregroundStyle(.tint)
                .frame(width: 112, height: 112)
                .background(.tint.opacity(0.12), in: .rect(cornerRadius: 28))
                .accessibilityHidden(true)
            VStack(spacing: 12) {
                Text(page.title)
                    .font(.largeTitle.bold())
                    .multilineTextAlignment(.center)
                Text(page.message)
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding()
    }
}
