import Foundation
import Testing
import UIKit
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

    @Test @MainActor
    func localProCanRecoverFromAnUnexpectedServerLimit() async {
        var api = BrickValAPIClient.successfulLookupStub
        api.syncSubscription = {
            SubscriptionSyncResult(verified: true, isPro: true)
        }
        let store = ScanStore(api: api)
        store.updateProStatus(true)

        #expect(await store.attemptProAccessRecovery())
        #expect(await store.attemptProAccessRecovery() == false)
    }

    @Test @MainActor
    func importedPhotoUsesBulkScanPipeline() async throws {
        let api = BrickValAPIClient(
            scanMinifigure: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            scanBulkMinifigures: { _, regions, source in
                #expect(regions.map(\.regionId) == ["photo-1"])
                #expect(source == .photoLibrary)
                let json = #"""
                {
                    "items": [],
                    "reviewItems": [],
                    "unresolvedRegions": [{"regionId":"photo-1","boundingBox":{"x":0.2,"y":0.2,"width":0.3,"height":0.5}}],
                    "unresolvedCount": 1,
                    "partial": true,
                    "timings": {},
                    "usage": null,
                    "recoveryToken": null
                }
                """#
                return try JSONDecoder().decode(BulkMinifigScanPayload.self, from: Data(json.utf8))
            },
            recoverBulkMinifigure: { _, _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            identify: { _, _, _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            lookup: { _, _, _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            bulkLookupMinifigures: { _, _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            monetizationStatus: { throw ScanStoreLifecycleTestError.unusedEndpoint },
            syncSubscription: { throw ScanStoreLifecycleTestError.unusedEndpoint },
            partColors: { throw ScanStoreLifecycleTestError.unusedEndpoint },
            submitFeedback: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            submitProductFeedback: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            deleteAccount: { throw ScanStoreLifecycleTestError.unusedEndpoint },
            registerNotificationDevice: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            unregisterNotificationDevice: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint }
        )
        let store = ScanStore(
            api: api,
            bulkPhotoDetector: StubBulkPhotoDetector(
                regions: [BulkScanRegion(
                    regionId: "photo-1",
                    boundingBox: NormalizedBoundingBox(x: 0.2, y: 0.2, width: 0.3, height: 0.5)
                )]
            )
        )
        store.intent = .bulk

        await store.importBulkPhoto(try recoveryImageData())

        #expect(store.phase == .review)
        #expect(store.presentedSheet != nil)
        #expect(store.frozenImageData != nil)
    }

    @Test @MainActor
    func bulkRecoveryUsesTwoRequestsAtMostAndReportsTapOrder() async throws {
        let probe = RecoveryConcurrencyProbe()
        let payload = try recoveryPayload()
        let api = BrickValAPIClient(
            scanMinifigure: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            scanBulkMinifigures: { _, _, _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            recoverBulkMinifigure: { _, _ in
                await probe.begin()
                try await Task.sleep(for: .milliseconds(30))
                await probe.end()
                return payload
            },
            identify: { _, _, _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            lookup: { _, _, _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            bulkLookupMinifigures: { _, _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            monetizationStatus: { throw ScanStoreLifecycleTestError.unusedEndpoint },
            syncSubscription: { throw ScanStoreLifecycleTestError.unusedEndpoint },
            partColors: { throw ScanStoreLifecycleTestError.unusedEndpoint },
            submitFeedback: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            submitProductFeedback: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            deleteAccount: { throw ScanStoreLifecycleTestError.unusedEndpoint },
            registerNotificationDevice: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            unregisterNotificationDevice: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint }
        )
        let store = ScanStore(api: api)
        let selections = (0..<4).map { index in
            BulkRecoverySelection(
                id: "selection-\(index)",
                order: index,
                normalizedPoint: BulkRecoveryPoint(x: 0.2 + Double(index) * 0.18, y: 0.4),
                focusBox: NormalizedBoundingBox(x: 0.1 + Double(index) * 0.18, y: 0.2, width: 0.16, height: 0.3)
            )
        }
        let imageData = try recoveryImageData()
        var progress: [Int] = []

        let outcomes = await store.recoverBulkMinifigures(
            imageData: imageData,
            selections: selections,
            recoveryToken: "test-token",
            onProgress: { completed, _ in progress.append(completed) }
        )

        #expect(outcomes.map(\.selection.id) == selections.map(\.id))
        #expect(outcomes.allSatisfy { $0.isMatched })
        #expect(progress == [1, 2, 3, 4])
        let maximumInFlight = await probe.maximumInFlight()
        #expect(maximumInFlight <= 2)
    }

    private func recoveryPayload() throws -> BulkRecoveryPayload {
        let json = #"""
        {
          "candidates": [
            {
              "id": "sh0115",
              "score": 0.92,
              "result": {
                "figInfo": {
                  "name": "Spider-Man",
                  "image_url": null,
                  "fig_number": "sh0115",
                  "year_released": 2017
                },
                "pricing": {
                  "hero_new_avg_usd": null,
                  "rrp_usd": null,
                  "gain_pct": null,
                  "data_source": "test",
                  "new_sold_avg_usd": null,
                  "used_sold_avg_usd": 5.14,
                  "new_stock_avg_usd": null,
                  "used_stock_avg_usd": null,
                  "bricklink_new_avg_usd": null,
                  "bricklink_used_avg_usd": null
                },
                "market_history": []
              }
            }
          ]
        }
        """#
        return try JSONDecoder().decode(BulkRecoveryPayload.self, from: Data(json.utf8))
    }

    private func recoveryImageData() throws -> Data {
        UIGraphicsImageRenderer(size: CGSize(width: 400, height: 400)).jpegData(withCompressionQuality: 0.9) { context in
            UIColor.white.setFill()
            context.fill(CGRect(x: 0, y: 0, width: 400, height: 400))
        }
    }
}

private actor RecoveryConcurrencyProbe {
    private var inFlight = 0
    private var maximum = 0

    func begin() {
        inFlight += 1
        maximum = max(maximum, inFlight)
    }

    func end() {
        inFlight -= 1
    }

    func maximumInFlight() -> Int { maximum }
}

private struct StubBulkPhotoDetector: BulkPhotoDetecting {
    let regions: [BulkScanRegion]

    func detectBulkRegions(in imageData: Data, limit: Int) async throws -> BulkPhotoDetectionBatch {
        BulkPhotoDetectionBatch(
            regions: Array(regions.prefix(limit)),
            inferenceMilliseconds: 12,
            modelVersion: "test-detector",
            tileCount: 26
        )
    }
}

private extension BrickValAPIClient {
    static let successfulLookupStub = BrickValAPIClient(
        scanMinifigure: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
        scanBulkMinifigures: { _, _, _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
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
        syncSubscription: { throw ScanStoreLifecycleTestError.unusedEndpoint },
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
