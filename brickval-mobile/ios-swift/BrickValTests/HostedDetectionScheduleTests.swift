import Foundation
import Testing
@testable import BrickVal

struct HostedDetectionScheduleTests {
    @Test func samplesAtEightHundredMillisecondsThenSlows() {
        var schedule = HostedDetectionSchedule()
        let start = Date(timeIntervalSince1970: 100)
        #expect(schedule.shouldSample(now: start, cameraStable: true))
        schedule.start(now: start)
        #expect(!schedule.shouldSample(now: start.addingTimeInterval(1), cameraStable: true))
        schedule.complete()
        #expect(schedule.shouldSample(now: start.addingTimeInterval(0.8), cameraStable: true))

        schedule.attempts = 8
        schedule.lastRequestedAt = start
        #expect(!schedule.shouldSample(now: start.addingTimeInterval(1.9), cameraStable: true))
        #expect(schedule.shouldSample(now: start.addingTimeInterval(2), cameraStable: true))
    }

    @Test func waitsForStableCameraAndNoInflightRequest() {
        var schedule = HostedDetectionSchedule()
        let now = Date.now
        #expect(!schedule.shouldSample(now: now, cameraStable: false))
        schedule.start(now: now)
        #expect(!schedule.shouldSample(now: now.addingTimeInterval(10), cameraStable: true))
    }
}
