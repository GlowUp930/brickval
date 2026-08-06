import Foundation
import Testing
@testable import BrickVal

struct AutoScanSessionTests {
    @Test func capturesAfterThreeConsistentObservationsWhileDeviceIsStable() {
        var session = AutoScanSession()
        session.observe([observation(x: 0.35, confidence: 0.31)], deviceStable: true)
        #expect(session.phase == .holding)
        session.observe([observation(x: 0.36, confidence: 0.32)], deviceStable: true)
        #expect(!session.captureRequested)
        session.observe([observation(x: 0.355, confidence: 0.30)], deviceStable: true)
        #expect(session.captureRequested)
        #expect(session.phase == .capturing)
    }

    @Test func movementRestartsConsistencyCount() {
        var session = AutoScanSession()
        session.observe([observation(x: 0.20)], deviceStable: true)
        session.observe([observation(x: 0.21)], deviceStable: true)
        session.observe([observation(x: 0.60)], deviceStable: true)
        #expect(session.consistentObservationCount == 1)
        #expect(!session.captureRequested)
    }

    @Test func blocksMultipleMinifigures() {
        var session = AutoScanSession()
        session.observe([observation(x: 0.1), observation(x: 0.6)], deviceStable: true)
        #expect(session.blockReason == .multiple)
        #expect(!session.captureRequested)
    }

    @Test func rejectsLowConfidencePartialAndOversizedTargets() {
        var session = AutoScanSession()
        session.observe([observation(x: 0.3, confidence: 0.29)], deviceStable: true)
        #expect(session.phase == .searching)
        session.observe([observation(x: 0.3, fullyVisible: false)], deviceStable: true)
        #expect(session.blockReason == .partial)
        session.observe(
            [observation(x: 0.05, width: 0.9, height: 0.9)],
            deviceStable: true
        )
        #expect(session.phase == .searching)
    }

    @Test func unstableDeviceCannotCompleteCapture() {
        var session = AutoScanSession()
        session.observe([observation(x: 0.35)], deviceStable: true)
        session.observe([observation(x: 0.36)], deviceStable: true)
        session.observe([observation(x: 0.355)], deviceStable: false)
        #expect(!session.captureRequested)
        #expect(session.consistentObservationCount == 1)
    }

    @Test @MainActor
    func minifigureUsesAutomaticCaptureAndStillAllowsManualCapture() async {
        let store = ScanStore(onDeviceSmartScanEnabled: true)
        #expect(store.intent == .single)
        #expect(store.canUseSmartScan)

        await store.captureManually()
        #expect(store.phase != .idle)

        store.intent = .bulk
        #expect(!store.canUseSmartScan)
    }

    @Test @MainActor
    func singleScanFallsBackToManualCaptureWhenAutomaticScanIsUnavailable() async {
        let store = ScanStore(onDeviceSmartScanEnabled: false)

        #expect(store.intent == .single)
        #expect(!store.canUseSmartScan)

        await store.captureManually()

        #expect(store.phase != .idle)
    }

    private func observation(
        x: Double,
        confidence: Double = 0.9,
        fullyVisible: Bool = true,
        width: Double = 0.4,
        height: Double = 0.5
    ) -> DetectionObservation {
        DetectionObservation(
            confidence: confidence,
            boundingBox: NormalizedBoundingBox(x: x, y: 0.2, width: width, height: height),
            fullyVisible: fullyVisible,
            regionID: "region"
        )
    }
}
