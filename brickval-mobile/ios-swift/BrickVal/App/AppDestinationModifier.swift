import SwiftUI

struct AppDestinationModifier: ViewModifier {
    func body(content: Content) -> some View {
        content.navigationDestination(for: AppRoute.self) { route in
            switch route {
            case .collectionItem(let item): ItemDetailView(item: item)
            case .appearance: AppearanceSettingsView()
            case .account: AccountView()
            case .subscription: SubscriptionView()
            }
        }
    }
}

extension View {
    func withAppDestinations() -> some View { modifier(AppDestinationModifier()) }
}
