import Foundation
import Testing
@testable import BrickVal

struct ProductFeedbackModelsTests {
    @Test
    func pmfSurveyRequiresSevenDaysAndFiveSuccessfulScans() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)

        #expect(ProductFeedbackEligibility.shouldPresentPMF(
            now: now,
            firstSuccessfulScanAt: now.addingTimeInterval(-7 * 24 * 60 * 60),
            successfulScanCount: 5,
            lastSurveyAt: nil,
            lastPMFSurveyAt: nil
        ))
        #expect(!ProductFeedbackEligibility.shouldPresentPMF(
            now: now,
            firstSuccessfulScanAt: now.addingTimeInterval(-6 * 24 * 60 * 60),
            successfulScanCount: 5,
            lastSurveyAt: nil,
            lastPMFSurveyAt: nil
        ))
        #expect(!ProductFeedbackEligibility.shouldPresentPMF(
            now: now,
            firstSuccessfulScanAt: now.addingTimeInterval(-7 * 24 * 60 * 60),
            successfulScanCount: 4,
            lastSurveyAt: nil,
            lastPMFSurveyAt: nil
        ))
    }

    @Test
    func pmfSurveyHonorsCooldowns() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)

        #expect(!ProductFeedbackEligibility.shouldPresentPMF(
            now: now,
            firstSuccessfulScanAt: now.addingTimeInterval(-30 * 24 * 60 * 60),
            successfulScanCount: 5,
            lastSurveyAt: now.addingTimeInterval(-10 * 24 * 60 * 60),
            lastPMFSurveyAt: nil
        ))
        #expect(!ProductFeedbackEligibility.shouldPresentPMF(
            now: now,
            firstSuccessfulScanAt: now.addingTimeInterval(-120 * 24 * 60 * 60),
            successfulScanCount: 5,
            lastSurveyAt: now.addingTimeInterval(-40 * 24 * 60 * 60),
            lastPMFSurveyAt: now.addingTimeInterval(-89 * 24 * 60 * 60)
        ))
        #expect(ProductFeedbackEligibility.shouldPresentPMF(
            now: now,
            firstSuccessfulScanAt: now.addingTimeInterval(-120 * 24 * 60 * 60),
            successfulScanCount: 5,
            lastSurveyAt: now.addingTimeInterval(-40 * 24 * 60 * 60),
            lastPMFSurveyAt: now.addingTimeInterval(-90 * 24 * 60 * 60)
        ))
    }

    @Test
    func cancellationEventKeyChangesForEachRenewalDate() {
        let first = ProductFeedbackEligibility.cancellationEventKey(
            productID: "com.brickval.app.pro.yearly",
            expirationDate: Date(timeIntervalSince1970: 1_800_000_000)
        )
        let second = ProductFeedbackEligibility.cancellationEventKey(
            productID: "com.brickval.app.pro.yearly",
            expirationDate: Date(timeIntervalSince1970: 1_900_000_000)
        )

        #expect(first != second)
        #expect(first.contains("com.brickval.app.pro.yearly"))
    }
}
