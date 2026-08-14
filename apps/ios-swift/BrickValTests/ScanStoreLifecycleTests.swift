import Foundation
import Testing
@testable import BrickVal

struct ScanStoreLifecycleTests {
    @Test
    func failedScanPausesLiveDetectionUntilRetry() {
        #expect(ScanPhase.failed("Bulk scan unavailable").allowsLiveDetection == false)
        #expect(ScanPhase.searching.allowsLiveDetection)
        #expect(ScanPhase.holding.allowsLiveDetection)
    }

    @Test @MainActor
    func dismissingSuccessfulResultRestartsScanner() async throws {
        let store = ScanStore(api: .successfulLookupStub)

        try await store.manualLookup(identifier: "sh0115", type: .minifig, colorID: nil)
        #expect(store.phase == .result)
        #expect(store.presentedSheet != nil)

        // SwiftUI writes nil to the item binding when a sheet is swiped down.
        store.presentedSheet = nil

        #expect(store.phase == .searching)
        #expect(store.frozenImageData == nil)
    }
}

private extension BrickValAPIClient {
    static let successfulLookupStub = BrickValAPIClient(
        scanMinifigure: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
        scanBulkMinifigures: { _, _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
        recoverBulkMinifigure: { _, _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
        identify: { _, _, _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
        lookup: { identifier, type, _ in
            LookupResult(
                identifier: identifier,
                itemType: type,
                name: "Test minifigure",
                theme: "Test",
                pieces: nil,
                yearReleased: nil,
                isObsolete: nil,
                imageURL: nil,
                pricing: LookupPricing(
                    heroNewAverageUSD: nil,
                    rrpUSD: nil,
                    gainPercent: nil,
                    dataSource: nil,
                    newSoldAverageUSD: nil,
                    usedSoldAverageUSD: 5,
                    newStockAverageUSD: nil,
                    usedStockAverageUSD: nil,
                    brickLinkNewAverageUSD: nil,
                    brickLinkUsedAverageUSD: nil
                ),
                marketHistory: [],
                colorID: nil,
                colorName: nil
            )
        },
        bulkLookupMinifigures: { _, _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
        monetizationStatus: {
            MonetizationStatus(policy: .phaseOne, usage: .empty())
        },
        partColors: { throw ScanStoreLifecycleTestError.unusedEndpoint },
        submitFeedback: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
        submitProductFeedback: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
        deleteAccount: { throw ScanStoreLifecycleTestError.unusedEndpoint },
        registerNotificationDevice: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
        unregisterNotificationDevice: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint }
    )
}

private enum ScanStoreLifecycleTestError: Error {
    case unusedEndpoint
}
