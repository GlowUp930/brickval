import SwiftUI

struct ScanTabView: View {
    @Environment(\.brickValAPIClient) private var apiClient
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(MonetizationStore.self) private var monetization
    @Binding var path: [AppRoute]

    var body: some View {
        NavigationStack(path: $path) {
            Group {
                if entitlements.isLoading && monetization.accessCohort == .hardTrial {
                    HardAccessStatusView()
                } else if monetization.requiresProForScanning(isPro: entitlements.isPro) {
                    HardScanAccessView()
                } else {
                    ScannerView(api: apiClient)
                }
            }
            .withAppDestinations()
        }
    }
}

private struct HardAccessStatusView: View {
    var body: some View {
        ZStack {
            BrickValStyle.Primitive.black.ignoresSafeArea()

            VStack(spacing: BrickValStyle.Primitive.space16) {
                ProgressView()
                    .tint(.white)
                    .controlSize(.large)
                Text("Checking your access...")
                    .font(.headline)
                    .foregroundStyle(.white.opacity(0.72))
            }
        }
        .preferredColorScheme(.dark)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Checking your BrickValue Pro access")
    }
}
