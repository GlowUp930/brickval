import SwiftUI

@main
struct BrickValApp: App {
    @UIApplicationDelegateAdaptor(BrickValAppDelegate.self) private var appDelegate
    @State private var router = AppRouter()
    @State private var collectionStore = CollectionStore()
    @State private var preferences = PreferencesStore()
    @State private var entitlements = EntitlementStore()
    @State private var monetization = MonetizationStore()
    @State private var currency = CurrencyStore()
    @State private var notifications: NotificationCoordinator
    @State private var sdkCoordinator: AppSDKCoordinator
    @State private var productFeedback: ProductFeedbackStore

    init() {
        let entitlementStore = EntitlementStore()
        let notificationCoordinator = NotificationCoordinator()
#if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-showProfileTabDemo") ||
            ProcessInfo.processInfo.arguments.contains("-showProGatingDemo") ||
            ProcessInfo.processInfo.arguments.contains("-showHardPaywallPreviewRootDemo") {
            entitlementStore.update(isPro: true)
        }
#endif
        let sdkCoordinator = AppSDKCoordinator(
            entitlementStore: entitlementStore,
            notificationCoordinator: notificationCoordinator
        )
        _entitlements = State(initialValue: entitlementStore)
        _notifications = State(initialValue: notificationCoordinator)
        _sdkCoordinator = State(initialValue: sdkCoordinator)
        _productFeedback = State(initialValue: ProductFeedbackStore(api: sdkCoordinator.apiClient))
    }

    var body: some Scene {
        WindowGroup {
            let language = preferences.effectiveLanguage
            SDKEnvironmentRootView(coordinator: sdkCoordinator)
                .environment(router)
                .environment(collectionStore)
                .environment(preferences)
                .environment(entitlements)
                .environment(monetization)
                .environment(currency)
                .environment(notifications)
                .environment(productFeedback)
                .environment(\.locale, language.locale)
                .environment(
                    \.layoutDirection,
                    language.isRightToLeft ? .rightToLeft : .leftToRight
                )
                .environment(\.appSDKCoordinator, sdkCoordinator)
                .environment(\.brickValAPIClient, sdkCoordinator.apiClient)
                .preferredColorScheme(activeColorScheme)
                .environment(\.brickValAccent, activeAccent)
                .tint(activeAccent)
                .onOpenURL(perform: router.handle)
                .onAppear {
                    notifications.updatePolicy(monetization.policy.notifications)
                    notifications.updateLanguage(language)
                    sdkCoordinator.updateLocalization(language)
                    appDelegate.onDeviceToken = { token in
                        notifications.setAPNsDeviceToken(token)
                    }
                    notifications.setDeviceRegistrationHandler { registration in
                        try await sdkCoordinator.apiClient.registerNotificationDevice(registration)
                    }
                    notifications.setResponseHandler { url in
                        router.handle(url: url)
                    }
                }
                .onChange(of: monetization.policy) { _, policy in
                    notifications.updatePolicy(policy.notifications)
                }
                .onChange(of: preferences.languageOverride) { _, _ in
                    let language = preferences.effectiveLanguage
                    notifications.updateLanguage(language)
                    sdkCoordinator.updateLocalization(language)
                }
                .task {
                    await notifications.refreshAuthorizationStatus()
                    await currency.refresh(using: sdkCoordinator.apiClient)
                }
        }
    }

    private var activeAccent: Color {
        entitlements.isPro ? preferences.accent.color : AccentPreference.green.color
    }

    private var activeColorScheme: ColorScheme? {
        if !preferences.hasCompletedOnboarding ||
            preferences.isReplayingOnboarding ||
            ProcessInfo.processInfo.arguments.contains("-showOnboardingDemo") ||
            ProcessInfo.processInfo.arguments.contains("-showOnboardingAccountDemo") ||
            ProcessInfo.processInfo.arguments.contains("-showOnboardingDetailsDemo") {
            return .light
        }
        return entitlements.isPro ? preferences.theme.colorScheme : ThemePreference.dark.colorScheme
    }
}

final class BrickValAppDelegate: NSObject, UIApplicationDelegate {
    var onDeviceToken: (@MainActor @Sendable (String) -> Void)?

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        Task { @MainActor [weak self] in
            self?.onDeviceToken?(token)
        }
    }
}
