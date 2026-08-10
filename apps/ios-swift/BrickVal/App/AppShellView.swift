import SwiftUI

struct AppShellView: View {
    @Environment(AppRouter.self) private var router
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(\.appSDKCoordinator) private var coordinator

    var body: some View {
        @Bindable var router = router
        Group {
            if #available(iOS 18.0, *) {
                TabView(selection: $router.selectedTab) {
                    Tab("Collection", systemImage: "shippingbox", value: .collection) {
                        CollectionTabView(path: $router.collectionPath)
                    }
                    Tab("Scan", systemImage: "viewfinder", value: .scan) {
                        ScanTabView(path: $router.scanPath)
                    }
                    Tab("Profile", systemImage: "person.crop.circle", value: .settings) {
                        SettingsTabView(path: $router.settingsPath)
                    }
                }
            } else {
                TabView(selection: $router.selectedTab) {
                    CollectionTabView(path: $router.collectionPath)
                        .tabItem { Label("Collection", systemImage: "shippingbox") }
                        .tag(AppTab.collection)
                    ScanTabView(path: $router.scanPath)
                        .tabItem { Label("Scan", systemImage: "viewfinder") }
                        .tag(AppTab.scan)
                    SettingsTabView(path: $router.settingsPath)
                        .tabItem { Label("Profile", systemImage: "person.crop.circle") }
                        .tag(AppTab.settings)
                }
            }
        }
        .sheet(isPresented: subscriptionFallbackBinding) {
            NavigationStack {
                SubscriptionView()
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Done") { coordinator?.dismissSubscriptionFallback() }
                        }
                    }
            }
        }
        .fullScreenCover(isPresented: proWelcomeBinding) {
            ProWelcomeView()
        }
    }

    private var subscriptionFallbackBinding: Binding<Bool> {
        Binding(
            get: { coordinator?.showsSubscriptionFallback == true },
            set: { if !$0 { coordinator?.dismissSubscriptionFallback() } }
        )
    }

    private var proWelcomeBinding: Binding<Bool> {
        Binding(
            get: { entitlements.shouldPresentProWelcome },
            set: { if !$0 { entitlements.dismissProWelcome() } }
        )
    }
}

#Preview {
    AppShellView()
        .environment(AppRouter())
        .environment(CollectionStore())
        .environment(PreferencesStore())
        .environment(EntitlementStore())
        .environment(MonetizationStore())
}
