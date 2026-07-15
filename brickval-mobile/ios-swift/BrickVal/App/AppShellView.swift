import SwiftUI

struct AppShellView: View {
    @Environment(AppRouter.self) private var router

    var body: some View {
        @Bindable var router = router
        if #available(iOS 18.0, *) {
            TabView(selection: $router.selectedTab) {
                Tab("Collection", systemImage: "shippingbox", value: .collection) {
                    CollectionTabView(path: $router.collectionPath)
                }
                Tab("Scan", systemImage: "viewfinder", value: .scan) {
                    ScanTabView(path: $router.scanPath)
                }
                Tab("Settings", systemImage: "gearshape", value: .settings) {
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
                    .tabItem { Label("Settings", systemImage: "gearshape") }
                    .tag(AppTab.settings)
            }
        }
    }
}

#Preview {
    AppShellView()
        .environment(AppRouter())
        .environment(CollectionStore())
        .environment(PreferencesStore())
        .environment(EntitlementStore())
}
