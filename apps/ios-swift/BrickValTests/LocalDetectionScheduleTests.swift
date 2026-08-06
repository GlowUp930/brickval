import Foundation
import Testing
@testable import BrickVal

struct LocalDetectionScheduleTests {
    @Test func limitsInferenceToSixFramesPerSecond() {
        var schedule = LocalDetectionSchedule()
        let start = Date(timeIntervalSince1970: 100)

        #expect(schedule.shouldProcess(frameTimestamp: start, now: start))
        schedule.didStart(frameTimestamp: start, now: start)
        #expect(!schedule.shouldProcess(
            frameTimestamp: start.addingTimeInterval(0.10),
            now: start.addingTimeInterval(0.10)
        ))
        schedule.didFinish()
        #expect(schedule.shouldProcess(
            frameTimestamp: start.addingTimeInterval(1.0 / 6.0),
            now: start.addingTimeInterval(1.0 / 6.0)
        ))
    }

    @Test func rejectsInflightDuplicateAndStaleFrames() {
        var schedule = LocalDetectionSchedule()
        let start = Date(timeIntervalSince1970: 100)
        schedule.didStart(frameTimestamp: start, now: start)

        #expect(!schedule.shouldProcess(
            frameTimestamp: start.addingTimeInterval(1),
            now: start.addingTimeInterval(1)
        ))
        schedule.didFinish()
        #expect(!schedule.shouldProcess(
            frameTimestamp: start,
            now: start.addingTimeInterval(1)
        ))
        #expect(!schedule.shouldProcess(
            frameTimestamp: start.addingTimeInterval(0.2),
            now: start.addingTimeInterval(1)
        ))
    }

    @Test func rateLimitUsesInferenceStartTimeRatherThanAStaleFrameTimestamp() {
        var schedule = LocalDetectionSchedule()
        let frameTime = Date(timeIntervalSince1970: 100)
        let startTime = frameTime.addingTimeInterval(0.30)
        schedule.didStart(frameTimestamp: frameTime, now: startTime)
        schedule.didFinish()

        #expect(!schedule.shouldProcess(
            frameTimestamp: startTime.addingTimeInterval(0.05),
            now: startTime.addingTimeInterval(0.05)
        ))
        #expect(schedule.shouldProcess(
            frameTimestamp: startTime.addingTimeInterval(1.0 / 6.0),
            now: startTime.addingTimeInterval(1.0 / 6.0)
        ))
    }
}
