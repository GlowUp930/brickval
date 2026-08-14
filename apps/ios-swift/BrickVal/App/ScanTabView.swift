import SwiftUI

struct ScanTabView: View {
    @Environment(\.brickValAPIClient) private var apiClient
    @Binding var path: [AppRoute]

    var body: some View {
        NavigationStack(path: $path) {
            ScannerView(api: apiClient)
            .withAppDestinations()
        }
    }
}
