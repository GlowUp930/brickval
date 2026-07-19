import SwiftUI

struct SDKEnvironmentRootView: View {
    let coordinator: AppSDKCoordinator

    var body: some View {
#if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-showScanResultDemo") {
            ScanResultView(result: .designDemo, reset: {})
        } else {
            appRoot
        }
#else
        appRoot
#endif
    }

    @ViewBuilder
    private var appRoot: some View {
        if let clerk = coordinator.clerk {
            AppRootView()
                .environment(clerk)
                .task(id: clerk.user?.id) {
                    await coordinator.synchronizeIdentity(userID: clerk.user?.id)
                }
        } else {
            AppRootView()
        }
    }
}

#if DEBUG
private extension LookupResult {
    static let designDemo = LookupResult(
        identifier: "10307-1",
        itemType: .set,
        name: "Eiffel Tower",
        theme: "LEGO Icons",
        pieces: 10_001,
        yearReleased: 2022,
        isObsolete: false,
        imageURL: URL(string: "https://images.brickset.com/sets/images/10307-1.jpg"),
        pricing: LookupPricing(
            heroNewAverageUSD: 714.32,
            rrpUSD: 629.99,
            gainPercent: 13.39,
            dataSource: "sold",
            newSoldAverageUSD: 714.32,
            usedSoldAverageUSD: 548.75,
            newStockAverageUSD: 739.00,
            usedStockAverageUSD: 579.00,
            brickLinkNewAverageUSD: 708.40,
            brickLinkUsedAverageUSD: 552.10
        ),
        marketHistory: [
            .init(date: "Jan", priceUSD: 612, source: "sold"),
            .init(date: "Feb", priceUSD: 640, source: "sold"),
            .init(date: "Mar", priceUSD: 625, source: "sold"),
            .init(date: "Apr", priceUSD: 681, source: "sold"),
            .init(date: "May", priceUSD: 668, source: "sold"),
            .init(date: "Jun", priceUSD: 704, source: "sold"),
            .init(date: "Jul", priceUSD: 714, source: "sold")
        ],
        colorID: nil,
        colorName: nil
    )
}
#endif
