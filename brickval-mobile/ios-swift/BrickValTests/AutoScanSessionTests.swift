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
