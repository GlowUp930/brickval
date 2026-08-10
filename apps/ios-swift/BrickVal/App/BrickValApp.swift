import SwiftUI

@main
struct BrickValApp: App {
    @State private var router = AppRouter()
    @State private var collectionStore = CollectionStore()
    @State private var preferences = PreferencesStore()
    @State private var entitlements = EntitlementStore()
    @State private var monetization = MonetizationStore()
    @State private var sdkCoordinator: AppSDKCoordinator

    init() {
        let entitlementStore = EntitlementStore()
#if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-showProfileTabDemo") ||
            ProcessInfo.processInfo.arguments.contains("-showProGatingDemo") {
            entitlementStore.update(isPro: true)
        }
#endif
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
                .environment(monetization)
                .environment(\.appSDKCoordinator, sdkCoordinator)
                .environment(\.brickValAPIClient, sdkCoordinator.apiClient)
                .preferredColorScheme(activeColorScheme)
                .environment(\.brickValAccent, activeAccent)
                .tint(activeAccent)
                .onOpenURL(perform: router.handle)
        }
    }

    private var activeAccent: Color {
        entitlements.isPro ? preferences.accent.color : AccentPreference.green.color
    }

    private var activeColorScheme: ColorScheme? {
        if !preferences.hasCompletedOnboarding ||
            preferences.isReplayingOnboarding ||
            ProcessInfo.processInfo.arguments.contains("-showOnboardingDemo") {
            return .light
        }
        return entitlements.isPro ? preferences.theme.colorScheme : ThemePreference.dark.colorScheme
    }
}
