import SwiftUI

struct SettingsTabView: View {
    @Binding var path: [AppRoute]

    var body: some View {
        NavigationStack(path: $path) {
            SettingsView()
                .withAppDestinations()
        }
    }
}
