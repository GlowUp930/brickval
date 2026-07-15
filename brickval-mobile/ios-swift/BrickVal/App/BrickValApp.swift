import SwiftUI

@main
struct BrickValApp: App {
    @State private var router = AppRouter()
    @State private var collectionStore = CollectionStore()
    @State private var preferences = PreferencesStore()
    @State private var entitlements = EntitlementStore()
    @State private var sdkCoordinator: AppSDKCoordinator

    init() {
        let entitlementStore = EntitlementStore()
        _entitlements = State(initialValue: entitlementStore)
        _sdkCoordinator = State(initialValue: AppSDKCoordinator(entitlementStore: entitlementStore))
    }

    var body: some Scene {
        WindowGroup {
            SDKEnvironmentRootView(coordinator: sdkCoordinator)
                .environment(router)
                .environment(collectionStore)
                .environment(preferences)
                .environment(entitlements)
                .environment(\.appSDKCoordinator, sdkCoordinator)
                .environment(\.brickValAPIClient, sdkCoordinator.apiClient)
                .preferredColorScheme(preferences.theme.colorScheme)
                .tint(preferences.accent.color)
                .onOpenURL(perform: router.handle)
        }
    }
}
