import SwiftUI

struct SDKEnvironmentRootView: View {
    let coordinator: AppSDKCoordinator

    var body: some View {
#if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-showProfileDesign1Demo") {
            ProfileDesignDraftsView(initialDraft: .compact)
        } else if ProcessInfo.processInfo.arguments.contains("-showProfileDesign2Demo") {
            ProfileDesignDraftsView(initialDraft: .collectorCard)
        } else if ProcessInfo.processInfo.arguments.contains("-showProfileDesign3Demo") {
            ProfileDesignDraftsView(initialDraft: .nativeList)
        } else if ProcessInfo.processInfo.arguments.contains("-showProfileDesign4Demo") {
            ProfileDesignDraftsView(initialDraft: .stage)
        } else if ProcessInfo.processInfo.arguments.contains("-showProfileTabDemo") {
            NavigationStack {
                SettingsView()
                    .withAppDestinations()
            }
        } else if ProcessInfo.processInfo.arguments.contains("-showAccountAuthDemo"), let clerk = coordinator.clerk {
            NavigationStack {
                AccountView()
                    .environment(clerk)
            }
        } else if ProcessInfo.processInfo.arguments.contains("-showScannerProcessingLayoutDemo") {
            AppShellView()
        } else if ProcessInfo.processInfo.arguments.contains("-showScanResultDemo") {
            ScanResultView(result: .designDemo, reset: {})
        } else if ProcessInfo.processInfo.arguments.contains("-showScanReviewDemo") {
            ScanReviewView(
                review: .designDemo,
                store: ScanStore(onDeviceSmartScanEnabled: false)
            )
        } else if ProcessInfo.processInfo.arguments.contains("-showScanProcessingDemo") {
            ScanProcessingDemoView()
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

private extension ScanReview {
    static let designDemo = ScanReview(candidates: [
        ScanReviewCandidate(
            identifier: "sh0115",
            score: 0.74,
            result: .minifigureDemo(
                identifier: "sh0115",
                name: "Spider-Man - Black Web Pattern, Red Hips",
                usedPrice: 5.14
            )
        ),
        ScanReviewCandidate(
            identifier: "coltlbm16",
            score: 0.70,
            result: .minifigureDemo(
                identifier: "coltlbm16",
                name: "Catman, The LEGO Batman Movie, Series 1",
                usedPrice: 7.55
            )
        ),
        ScanReviewCandidate(
            identifier: "sh0318",
            score: 0.62,
            result: .minifigureDemo(
                identifier: "sh0318",
                name: "Batman - Utility Belt, Head Type 2",
                usedPrice: 4.30
            )
        ),
    ])
}

private extension LookupResult {
    static func minifigureDemo(identifier: String, name: String, usedPrice: Double) -> LookupResult {
        LookupResult(
            identifier: identifier,
            itemType: .minifig,
            name: name,
            theme: "Super Heroes",
            pieces: nil,
            yearReleased: nil,
            isObsolete: nil,
            imageURL: URL(string: "https://img.bricklink.com/ItemImage/MN/0/\(identifier).png"),
            pricing: LookupPricing(
                heroNewAverageUSD: nil,
                rrpUSD: nil,
                gainPercent: nil,
                dataSource: "sold",
                newSoldAverageUSD: nil,
                usedSoldAverageUSD: usedPrice,
                newStockAverageUSD: nil,
                usedStockAverageUSD: nil,
                brickLinkNewAverageUSD: nil,
                brickLinkUsedAverageUSD: nil
            ),
            marketHistory: [],
            colorID: nil,
            colorName: nil
        )
    }
}
#endif
