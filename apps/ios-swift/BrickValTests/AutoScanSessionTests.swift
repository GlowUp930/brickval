import Foundation
import Testing
@testable import BrickVal

struct AutoScanSessionTests {
    @Test func requiresTwoConsistentObservationsAndStability() {
        var session = AutoScanSession()
        session.observe([observation(x: 0.35, confidence: 0.76)])
        #expect(session.phase == .searching)
        session.observe([observation(x: 0.36, confidence: 0.75)])
        #expect(session.phase == .detected)

        let start = Date(timeIntervalSince1970: 100)
        session.observeStability(now: start, deviceStable: true, targetStable: true)
        #expect(session.phase == .holding)
        session.observeStability(now: start.addingTimeInterval(0.6), deviceStable: true, targetStable: true)
        #expect(session.captureRequested)
        #expect(session.phase == .capturing)
    }

    @Test func continuousDetectionDoesNotRestartTheHoldTimer() {
        var session = AutoScanSession()
        let start = Date(timeIntervalSince1970: 100)

        session.observe([observation(x: 0.35, confidence: 0.78)])
        session.observe([observation(x: 0.36, confidence: 0.79)])
        session.observeStability(now: start, deviceStable: true, targetStable: true)
        #expect(session.phase == .holding)

        // The hosted detector keeps reporting the same target while the user holds still.
        session.observe([observation(x: 0.355, confidence: 0.80)])
        session.observeStability(
            now: start.addingTimeInterval(0.7),
            deviceStable: true,
            targetStable: true
        )

        #expect(session.captureRequested)
        #expect(session.phase == .capturing)
    }

    @Test func blocksMultipleMinifigures() {
        var session = AutoScanSession()
        session.observe([observation(x: 0.1), observation(x: 0.6)])
        #expect(session.blockReason == .multiple)
        #expect(!session.captureRequested)
    }

    @Test func rejectsLowConfidenceAndPartialTargets() {
        var session = AutoScanSession()
        session.observe([observation(x: 0.3, confidence: 0.74)])
        #expect(session.phase == .searching)
        session.observe([observation(x: 0.3, fullyVisible: false)])
        #expect(session.blockReason == .partial)
    }

    @Test @MainActor
    func minifigureUsesAutomaticCaptureAndBulkDoesNot() async {
        let store = ScanStore(hostedSmartScanEnabled: true)
        #expect(store.intent == .single)
        #expect(store.canUseSmartScan)

        await store.captureManually()
        #expect(store.phase == .idle)

        store.intent = .bulk
        #expect(!store.canUseSmartScan)
    }

    @Test @MainActor
    func singleScanFallsBackToManualCaptureWhenAutomaticScanIsUnavailable() async {
        let store = ScanStore(hostedSmartScanEnabled: false)

        #expect(store.intent == .single)
        #expect(!store.canUseSmartScan)

        await store.captureManually()

        #expect(store.phase != .idle)
    }

    private func observation(
        x: Double,
        confidence: Double = 0.9,
        fullyVisible: Bool = true
    ) -> DetectionObservation {
        DetectionObservation(
            confidence: confidence,
            boundingBox: NormalizedBoundingBox(x: x, y: 0.2, width: 0.4, height: 0.5),
            fullyVisible: fullyVisible,
            regionID: "region"
        )
    }
}
