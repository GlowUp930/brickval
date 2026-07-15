import SwiftUI

struct CollectionTabView: View {
    @Binding var path: [AppRoute]

    var body: some View {
        NavigationStack(path: $path) {
            CollectionView()
                .withAppDestinations()
        }
    }
}
