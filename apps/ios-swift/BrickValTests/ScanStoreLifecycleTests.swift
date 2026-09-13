import Foundation
import Testing
import UIKit
import XCTest
@testable import BrickVal

struct ScanStoreLifecycleTests {
    @Test
    func failedScanPausesLiveDetectionUntilRetry() {
        #expect(ScanPhase.failed("Bulk scan unavailable").allowsLiveDetection == false)
        #expect(ScanPhase.searching.allowsLiveDetection)
        #expect(ScanPhase.holding.allowsLiveDetection)
    }

    @Test @MainActor
    func failedSingleScanReturnsToLivePreviewWithoutRetry() throws {
        let store = ScanStore()
        let imageData = try recoveryImageData()
        store.configureFailedScanDemo(imageData: imageData)

        store.resumeCameraAfterFailure()

        #expect(store.frozenImageData == nil)
        #expect(store.phase == .failed(BrickValLocalization.localized("No minifigure match was found. Try a closer, brighter photo.")))
        #expect(store.canCaptureAfterFailure)
    }

    @Test @MainActor
    func recognitionFailureReleasesCapturedPhotoWithoutRetry() async throws {
        var api = BrickValAPIClient.successfulLookupStub
        api.scanMinifigure = { _ in
            .notFound(timings: MinifigScanTimings(
                identificationMilliseconds: 20,
                pricingMilliseconds: nil,
                totalMilliseconds: 20
            ))
        }
        let store = ScanStore(api: api)

        await store.identifyGalleryImage(try recoveryImageData())

        #expect(store.phase == .failed(BrickValLocalization.localized("No minifigure match was found. Try a closer, brighter photo.")))
        #expect(store.frozenImageData == nil)
        #expect(store.canCaptureAfterFailure)
    }

    @Test @MainActor
    func cameraPreparationFailureStaysOutOfHandledScanReporting() async {
        let reporter = RecordingAppErrorReporter()
        let store = ScanStore(errorReporter: reporter)

        await store.captureManually()

        #expect(store.phase == .idle)
        #expect(reporter.contexts.isEmpty)
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
        #expect(store.presentedBulkResults != nil)
        #expect(store.presentedBulkResults?.source == .photoLibrary)
        #expect(store.frozenImageData != nil)
    }

    @Test @MainActor
    func importedPhotoCapsRegionsBeforeStartingBulkSession() async throws {
        let detectedRegions = (0..<61).map { index in
            BulkScanRegion(
                regionId: "photo-\(index + 1)",
                boundingBox: NormalizedBoundingBox(
                    x: Double(index % 10) * 0.08,
                    y: Double(index / 10) * 0.12,
                    width: 0.06,
                    height: 0.08
                )
            )
        }
        var api = BrickValAPIClient.successfulLookupStub
        api.startBulkScan = { _, regions, source in
            #expect(source == .photoLibrary)
            #expect(regions.count == 60)
            return BulkScanStartPayload(
                scanSource: source,
                regions: regions,
                sessionToken: "photo-library-session",
                recoveryToken: nil,
                proposalSource: "test"
            )
        }
        api.identifyBulkRegion = { _, _, _ in
            throw ScanStoreLifecycleTestError.unusedEndpoint
        }

        let store = ScanStore(
            api: api,
            bulkPhotoDetector: StubBulkPhotoDetector(regions: detectedRegions)
        )
        store.intent = .bulk

        await store.importBulkPhoto(try recoveryImageData())

        #expect(store.phase == .review)
        #expect(store.presentedBulkResults?.regions.count == 60)
    }

    @Test @MainActor
    func cancellingImportedPhotoDropsStaleDetectorResults() async throws {
        let store = ScanStore(
            api: .successfulLookupStub,
            bulkPhotoDetector: StubBulkPhotoDetector(
                regions: [BulkScanRegion(
                    regionId: "cancelled-photo",
                    boundingBox: NormalizedBoundingBox(x: 0.2, y: 0.2, width: 0.3, height: 0.5)
                )],
                delay: .milliseconds(80)
            )
        )
        store.intent = .bulk
        let imageData = try recoveryImageData()
        let task = Task { @MainActor in
            await store.importBulkPhoto(imageData)
        }
        try await Task.sleep(for: .milliseconds(10))
        store.cancelBulkScan()
        await task.value

        #expect(store.presentedBulkResults == nil)
        #expect(store.phase == .capturing)
    }

    @Test @MainActor
    func newSoftPhotoPreviewDoesNotCallBulkBackend() async throws {
        let suite = "ScanStoreLifecycleTests.lockedPreview.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }

        let monetization = MonetizationStore(
            defaults: defaults,
            initialPolicy: MonetizationPolicy(
                version: 5,
                accessExperiment: .init(enabled: false, hardPaywallPercent: 50, trialDays: 7),
                gates: .init(
                    singleDaily: true,
                    bulkRepeat: true,
                    collectionCapacity: true,
                    marketHistory: false,
                    appearance: true,
                    offerCodes: true
                ),
                limits: .init(
                    singleScansPerDay: 3,
                    introductoryBulkScans: 1,
                    collectionUniqueItems: 10
                ),
                lockedBulkPreview: true,
                notifications: .init(enabled: true, scanReset: true, trialEnding: true, accountAction: true)
            )
        )
        monetization.enrollNewUserIfNeeded(seed: 50)
        let probe = BackendCallProbe()
        var api = BrickValAPIClient.successfulLookupStub
        api.startBulkScan = { _, _, _ in
            await probe.record()
            throw ScanStoreLifecycleTestError.unusedEndpoint
        }
        api.identifyBulkRegion = { _, _, _ in
            await probe.record()
            throw ScanStoreLifecycleTestError.unusedEndpoint
        }
        api.scanBulkMinifigures = { _, _, _ in
            await probe.record()
            throw ScanStoreLifecycleTestError.unusedEndpoint
        }

        let regions = [BulkScanRegion(
            regionId: "preview-1",
            boundingBox: NormalizedBoundingBox(x: 0.2, y: 0.2, width: 0.3, height: 0.5)
        )]
        let store = ScanStore(
            api: api,
            bulkPhotoDetector: StubBulkPhotoDetector(regions: regions)
        )
        store.configureMonetization(monetization, isPro: false)
        store.intent = .bulk

        await store.importBulkPhoto(try recoveryImageData())

        let presentation = try #require(store.presentedBulkResults)
        #expect(presentation.accessMode == .lockedPreview)
        #expect(presentation.regions.count == regions.count)
        #expect(await probe.value() == 0)
    }

    @Test @MainActor
    func serverBulkLimitDuringProgressivePresentationFallsBackToLockedPreview() async throws {
        let suite = "ScanStoreLifecycleTests.serverLimitPreview.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }

        let monetization = MonetizationStore(defaults: defaults, initialPolicy: .phaseOne)
        monetization.applyServerUsage(UsageSnapshot(
            isPro: false,
            singleScan: UsageCounter(used: 0, limit: 3, remaining: 3, resetsAt: nil),
            bulkScan: UsageCounter(used: 0, limit: 1, remaining: 1, resetsAt: nil)
        ))

        var api = BrickValAPIClient.successfulLookupStub
        api.startBulkScan = { _, regions, source in
            BulkScanStartPayload(
                scanSource: source,
                regions: regions,
                sessionToken: "server-limit-session",
                recoveryToken: nil,
                proposalSource: "test"
            )
        }
        api.identifyBulkRegion = { _, _, _ in
            throw APIError(
                endpoint: "bulk region identification",
                statusCode: 402,
                serverMessage: "You've reached the bulk scan limit.",
                feature: .bulkScan,
                usage: nil
            )
        }

        let regions = [BulkScanRegion(
            regionId: "server-limit-1",
            boundingBox: NormalizedBoundingBox(x: 0.2, y: 0.2, width: 0.3, height: 0.5)
        )]
        let store = ScanStore(
            api: api,
            bulkPhotoDetector: StubBulkPhotoDetector(regions: regions)
        )
        store.configureMonetization(monetization, isPro: false)
        store.intent = .bulk

        await store.importBulkPhoto(try recoveryImageData())
        let presentation = try #require(store.presentedBulkResults)
        #expect(presentation.accessMode == .real)

        await store.processBulkPresentation(presentation)

        #expect(presentation.accessMode == .lockedPreview)
        #expect(presentation.terminalError == nil)
        #expect(store.proLimitFeature == nil)
        #expect(presentation.regions.count == regions.count)
    }

    @Test @MainActor
    func lowConfidenceBulkMatchUsesBestPricedCandidateWithoutReview() async throws {
        var api = BrickValAPIClient.successfulLookupStub
        api.startBulkScan = { _, regions, source in
            #expect(source == .photoLibrary)
            #expect(regions.map(\.regionId) == ["photo-1"])
            let json = #"""
            {
              "scanSource": "photoLibrary",
              "regions": [{"regionId":"photo-1","boundingBox":{"x":0.2,"y":0.2,"width":0.3,"height":0.5}}],
              "sessionToken": "test-session",
              "recoveryToken": null,
              "proposalSource": "local"
            }
            """#
            return try JSONDecoder().decode(BulkScanStartPayload.self, from: Data(json.utf8))
        }
        api.identifyBulkRegion = { _, regionID, _ in
            #expect(regionID == "photo-1")
            let json = #"""
            {
              "regionId": "photo-1",
              "status": "review",
              "candidates": [
                {
                  "id": "sh0133",
                  "score": 0.31,
                  "result": {
                    "figInfo": {"name":"Joker variant", "image_url":null, "fig_number":"sh0133", "year_released":2017},
                    "pricing": {"hero_new_avg_usd":null, "rrp_usd":null, "gain_pct":null, "data_source":"sold", "new_sold_avg_usd":null, "used_sold_avg_usd":14.45, "new_stock_avg_usd":null, "used_stock_avg_usd":null, "bricklink_new_avg_usd":null, "bricklink_used_avg_usd":null},
                    "market_history": []
                  }
                },
                {
                  "id": "sh1022",
                  "score": 0.42,
                  "result": {
                    "figInfo": {"name":"Joker", "image_url":null, "fig_number":"sh1022", "year_released":2017},
                    "pricing": {"hero_new_avg_usd":null, "rrp_usd":null, "gain_pct":null, "data_source":"sold", "new_sold_avg_usd":null, "used_sold_avg_usd":59.50, "new_stock_avg_usd":null, "used_stock_avg_usd":null, "bricklink_new_avg_usd":null, "bricklink_used_avg_usd":null},
                    "market_history": []
                  }
                },
                {
                  "id": "sh9999",
                  "score": 0.95,
                  "result": {
                    "figInfo": {"name":"Unpriced Joker", "image_url":null, "fig_number":"sh9999", "year_released":2017},
                    "pricing": {"hero_new_avg_usd":null, "rrp_usd":null, "gain_pct":null, "data_source":"sold", "new_sold_avg_usd":null, "used_sold_avg_usd":null, "new_stock_avg_usd":null, "used_stock_avg_usd":null, "bricklink_new_avg_usd":null, "bricklink_used_avg_usd":null},
                    "market_history": []
                  }
                }
              ],
              "usage": null
            }
            """#
            return try JSONDecoder().decode(BulkRegionIdentificationPayload.self, from: Data(json.utf8))
        }

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
        if let presentation = store.presentedBulkResults {
            await store.processBulkPresentation(presentation)
        }

        #expect(store.presentedBulkResults?.items.count == 1)
        #expect(store.presentedBulkResults?.items.first?.result.identifier == "sh1022")
        #expect(store.presentedBulkResults?.items.first?.confidence == 0.42)
        #expect(store.presentedBulkResults?.items.first?.orderedCandidates.map(\.identifier) == ["sh1022", "sh0133", "sh9999"])
    }

    @Test @MainActor
    func progressiveBulkPresentationKeepsFourLookupsInFlightAndCompletesPartialFailures() async throws {
        let probe = RecoveryConcurrencyProbe()
        let regions = (0..<5).map { index in
            BulkScanRegion(
                regionId: "region-\(index)",
                boundingBox: NormalizedBoundingBox(
                    x: Double(index) * 0.18,
                    y: 0.2,
                    width: 0.14,
                    height: 0.3
                )
            )
        }
        var api = BrickValAPIClient.successfulLookupStub
        api.startBulkScan = { _, incomingRegions, source in
            BulkScanStartPayload(
                scanSource: source,
                regions: incomingRegions,
                sessionToken: "progressive-session",
                recoveryToken: nil,
                proposalSource: "test"
            )
        }
        api.identifyBulkRegion = { _, regionID, _ in
            await probe.begin()
            if regionID == "region-4" {
                await probe.end()
                throw ScanStoreLifecycleTestError.unusedEndpoint
            }
            do {
                try await Task.sleep(for: .milliseconds(regionID == "region-0" ? 40 : 10))
            } catch {
                await probe.end()
                throw error
            }
            await probe.end()
            return try ScanStoreLifecycleTests.bulkRegionPayload(regionID: regionID)
        }

        let store = ScanStore(
            api: api,
            bulkPhotoDetector: StubBulkPhotoDetector(regions: regions)
        )
        store.intent = .bulk

        await store.importBulkPhoto(try recoveryImageData())
        let presentation = try #require(store.presentedBulkResults)
        #expect(presentation.items.isEmpty)
        #expect(presentation.terminalCount == 0)

        await store.processBulkPresentation(presentation)

        #expect(presentation.isTerminal)
        #expect(presentation.items.count == 4)
        #expect(presentation.unresolvedRegions.count == 1)
        #expect(await probe.maximumInFlight() <= 4)

        let failedPresentation = BulkScanPresentation(
            imageData: try recoveryImageData(),
            regions: regions,
            recoveryToken: nil,
            source: .photoLibrary,
            sessionToken: nil
        )
        for region in regions {
            failedPresentation.markUnresolved(region.regionId)
        }
        #expect(failedPresentation.isTerminal)
        #expect(failedPresentation.successfulCount == 0)
    }

    @Test @MainActor
    func importedPhoto400ReportsAndKeepsPhotoForRetry() async throws {
        let reporter = RecordingAppErrorReporter()
        let api = BrickValAPIClient(
            scanMinifigure: { _ in throw ScanStoreLifecycleTestError.unusedEndpoint },
            scanBulkMinifigures: { _, _, _ in
                throw APIError(
                    endpoint: "bulk minifig scan",
                    statusCode: 400,
                    code: "invalid_region",
                    serverMessage: "The scan included an invalid region list."
                )
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
            ),
            errorReporter: reporter
        )
        store.intent = .bulk
        let imageData = try recoveryImageData()

        await store.importBulkPhoto(imageData)

        #expect(store.phase == .failed("A valid minifigure crop is required."))
        #expect(store.frozenImageData == imageData)
        #expect(reporter.contexts.count == 1)
        #expect(reporter.contexts.first?.statusCode == 400)
        #expect(reporter.contexts.first?.scanSource == .photoLibrary)
        #expect(reporter.contexts.first?.regionCount == 1)

        await store.retryBulkScan()

        #expect(store.frozenImageData == imageData)
        #expect(reporter.contexts.count == 2)
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

    private static func bulkRegionPayload(regionID: String) throws -> BulkRegionIdentificationPayload {
        let json = """
        {
          "regionId": "\(regionID)",
          "status": "matched",
          "candidates": [{
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
          }],
          "usage": null
        }
        """
        return try JSONDecoder().decode(
            BulkRegionIdentificationPayload.self,
            from: Data(json.utf8)
        )
    }
}

final class ScanStorePhotoImportXCTests: XCTestCase {
    @MainActor
    func testExhaustedFreeBulkPhotoImportShowsLockedPreviewWithoutBackendCalls() async {
        let suiteName = "ScanStorePhotoImportXCTests.bulkGate.\(UUID().uuidString)"
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            XCTFail("Could not create isolated defaults")
            return
        }
        defer { defaults.removePersistentDomain(forName: suiteName) }

        let monetization = MonetizationStore(
            defaults: defaults,
            initialPolicy: .phaseOne,
            currentAppBuild: 142
        )
        monetization.applyServerUsage(UsageSnapshot(
            isPro: false,
            singleScan: UsageCounter(used: 0, limit: 3, remaining: 3, resetsAt: nil),
            bulkScan: UsageCounter(used: 1, limit: 1, remaining: 0, resetsAt: nil)
        ))

        let backendCalls = BackendCallProbe()
        var api = BrickValAPIClient.successfulLookupStub
        api.startBulkScan = { _, _, _ in
            await backendCalls.record()
            throw ScanStoreLifecycleTestError.unusedEndpoint
        }
        api.identifyBulkRegion = { _, _, _ in
            await backendCalls.record()
            throw ScanStoreLifecycleTestError.unusedEndpoint
        }
        api.scanBulkMinifigures = { _, _, _ in
            await backendCalls.record()
            throw ScanStoreLifecycleTestError.unusedEndpoint
        }
        let regions = [BulkScanRegion(
            regionId: "legacy-preview-1",
            boundingBox: NormalizedBoundingBox(x: 0.2, y: 0.2, width: 0.3, height: 0.5)
        )]
        let store = ScanStore(
            api: api,
            bulkPhotoDetector: StubBulkPhotoDetector(regions: regions)
        )
        store.configureMonetization(monetization, isPro: false)
        store.intent = .bulk

        await store.importBulkPhoto(Data("fixture".utf8))

        XCTAssertNil(store.proLimitFeature)
        XCTAssertEqual(store.phase, .review)
        XCTAssertEqual(store.presentedBulkResults?.accessMode, .lockedPreview)
        XCTAssertEqual(store.presentedBulkResults?.regions.count, regions.count)
        let backendCallCount = await backendCalls.value()
        XCTAssertEqual(backendCallCount, 0)
    }

    @MainActor
    func testServerBulkLimitConvertsFrozenPhotoToLockedPreview() async {
        let suiteName = "ScanStorePhotoImportXCTests.serverLimit.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defer { defaults.removePersistentDomain(forName: suiteName) }

        let monetization = MonetizationStore(defaults: defaults, initialPolicy: .phaseOne)
        monetization.applyServerUsage(UsageSnapshot(
            isPro: false,
            singleScan: UsageCounter(used: 0, limit: 3, remaining: 3, resetsAt: nil),
            bulkScan: UsageCounter(used: 0, limit: 1, remaining: 1, resetsAt: nil)
        ))

        var api = BrickValAPIClient.successfulLookupStub
        api.scanBulkMinifigures = { _, _, _ in
            throw APIError(
                endpoint: "bulk minifig scan",
                statusCode: 402,
                serverMessage: "You've used all 5 free scans. Upgrade to continue.",
                feature: .bulkScan,
                usage: UsageSnapshot(
                    isPro: false,
                    singleScan: UsageCounter(used: 0, limit: 3, remaining: 3, resetsAt: nil),
                    bulkScan: UsageCounter(used: 1, limit: 1, remaining: 0, resetsAt: nil)
                )
            )
        }

        let store = ScanStore(
            api: api,
            bulkPhotoDetector: StubBulkPhotoDetector(regions: [BulkScanRegion(
                regionId: "photo-1",
                boundingBox: NormalizedBoundingBox(x: 0.2, y: 0.2, width: 0.3, height: 0.5)
            )])
        )
        store.configureMonetization(monetization, isPro: false)
        store.intent = .bulk
        let imageData = UIGraphicsImageRenderer(size: CGSize(width: 8, height: 8)).image { _ in
            UIColor.white.setFill()
            UIRectFill(CGRect(x: 0, y: 0, width: 8, height: 8))
        }.jpegData(compressionQuality: 0.8)!

        await store.importBulkPhoto(imageData)

        XCTAssertNil(store.proLimitFeature)
        XCTAssertEqual(store.phase, .review)
        XCTAssertEqual(store.presentedBulkResults?.accessMode, .lockedPreview)
        XCTAssertEqual(store.presentedBulkResults?.regions.count, 1)
        XCTAssertEqual(store.frozenImageData, imageData)
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

private actor BackendCallProbe {
    private var count = 0

    func record() {
        count += 1
    }

    func value() -> Int { count }
}

private struct StubBulkPhotoDetector: BulkPhotoDetecting {
    let regions: [BulkScanRegion]
    var delay: Duration = .zero

    func detectBulkRegions(in imageData: Data, limit: Int) async throws -> BulkPhotoDetectionBatch {
        if delay > .zero {
            try await Task.sleep(for: delay)
        }
        return BulkPhotoDetectionBatch(
            regions: Array(regions.prefix(limit)),
            inferenceMilliseconds: 12,
            modelVersion: "test-detector",
            tileCount: 26
        )
    }
}

@MainActor
private final class RecordingAppErrorReporter: AppErrorReporting {
    var contexts: [AppErrorContext] = []

    func capture(error: Error, context: AppErrorContext) {
        contexts.append(context)
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
