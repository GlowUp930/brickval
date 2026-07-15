import SwiftUI

struct SDKEnvironmentRootView: View {
    let coordinator: AppSDKCoordinator

    var body: some View {
        if let clerk = coordinator.clerk {
            AppRootView()
                .environment(clerk)
                .task(id: clerk.user?.id) {
                    await coordinator.synchronizeIdentity(userID: clerk.user?.id)
                }
        } else {
            AppRootView()
        }
    }
}
