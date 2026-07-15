import SwiftUI

struct OnboardingGoalView: View {
    @Binding var selection: PrimaryGoal?

    var body: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.sectionSpacing) {
            VStack(alignment: .leading, spacing: 8) {
                Text("What do you want to do first?")
                    .font(.largeTitle.bold())
                Text("This only changes what Brickvalue highlights for you.")
                    .foregroundStyle(.secondary)
            }
            ForEach(PrimaryGoal.allCases) { goal in
                Button {
                    selection = goal
                } label: {
                    Label(goal.title, systemImage: selection == goal ? "checkmark.circle.fill" : "circle")
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(.thinMaterial, in: .rect(cornerRadius: BrickValStyle.cardRadius))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selection == goal ? .isSelected : [])
            }
            Spacer()
        }
        .padding()
    }
}
