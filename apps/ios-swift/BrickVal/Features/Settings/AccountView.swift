import SwiftUI

struct AccountView: View {
    @Environment(\.appSDKCoordinator) private var coordinator

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                CollectorProfileEditorView()
                    .padding(.horizontal, BrickValStyle.Primitive.space20)
                    .padding(.top, BrickValStyle.Primitive.space16)
                    .padding(.bottom, BrickValStyle.Primitive.space24)

                Divider()

                accountContent
            }
        }
        .background(BrickValStyle.Semantic.canvas.ignoresSafeArea())
        .navigationTitle("Manage Account")
    }

    @ViewBuilder
    private var accountContent: some View {
        if coordinator?.clerk != nil {
            ClerkAccountContentView()
                .padding(.top, BrickValStyle.Primitive.space8)
        } else {
            ContentUnavailableView(
                "Account configuration missing",
                systemImage: "person.crop.circle.badge.exclamationmark",
                description: Text("Collector profile is saved on this device. Sign-in requires the Clerk key.")
            )
            .padding(.vertical, 48)
        }
    }
}
