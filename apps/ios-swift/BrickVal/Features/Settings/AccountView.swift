import SwiftUI

struct AccountView: View {
    @Environment(\.appSDKCoordinator) private var coordinator

    var body: some View {
        VStack(spacing: 0) {
            CollectorAvatarPicker()
                .padding()
            Divider()
            if coordinator?.clerk != nil {
                ClerkAccountContentView()
            } else {
                ContentUnavailableView(
                    "Account configuration missing",
                    systemImage: "person.crop.circle.badge.exclamationmark",
                    description: Text("Collector profile is saved on this device. Sign-in requires the Clerk key.")
                )
            }
        }
        .navigationTitle("Account")
    }
}
