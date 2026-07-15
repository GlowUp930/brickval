import SwiftUI

struct AccountView: View {
    @Environment(\.appSDKCoordinator) private var coordinator

    var body: some View {
        if coordinator?.clerk != nil {
            ClerkAccountContentView()
        } else {
            ContentUnavailableView(
                "Account configuration missing",
                systemImage: "person.crop.circle.badge.exclamationmark",
                description: Text("Add the Clerk publishable key to Secrets.xcconfig for this build.")
            )
            .navigationTitle("Account")
        }
    }
}
