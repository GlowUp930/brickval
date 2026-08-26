import XCTest

@MainActor
final class ScannerProcessingLayoutUITests: XCTestCase {
    func testCapturedImageDoesNotExpandScannerIntoAdjacentControls() {
        let app = XCUIApplication()
        app.launchArguments = ["-showScannerProcessingLayoutDemo"]
        app.launch()

        let modePicker = app.segmentedControls["scanner.modePicker"]
        let cameraStage = app.otherElements["scanner.cameraStage"]
        let controls = app.otherElements["scanner.controls"]

        XCTAssertTrue(modePicker.waitForExistence(timeout: 3))
        XCTAssertTrue(cameraStage.waitForExistence(timeout: 3))
        XCTAssertTrue(controls.waitForExistence(timeout: 3))
        XCTAssertEqual(app.navigationBars.count, 0)
        XCTAssertGreaterThanOrEqual(modePicker.frame.height, 48)
        XCTAssertGreaterThan(modePicker.frame.minX, 8)
        XCTAssertGreaterThan(app.windows.firstMatch.frame.width - modePicker.frame.maxX, 8)
        XCTAssertLessThanOrEqual(modePicker.frame.maxY, cameraStage.frame.minY)
        XCTAssertLessThanOrEqual(cameraStage.frame.maxY, controls.frame.minY)
        XCTAssertEqual(cameraStage.frame.height / cameraStage.frame.width, 4.0 / 3.0, accuracy: 0.03)
    }

    func testBulkRecoverySelectsMultipleFiguresBeforeChecking() {
        let app = XCUIApplication()
        app.launchArguments = ["-showBulkRecoveryDemo"]
        app.launch()

        let enterRecovery = app.buttons["bulkRecovery.enter"]
        XCTAssertTrue(enterRecovery.waitForExistence(timeout: 8))
        XCTAssertGreaterThanOrEqual(enterRecovery.frame.height, 44)
        XCTAssertFalse(app.buttons["Skip"].exists)
        XCTAssertFalse(app.otherElements["bulkResults.finalSummary"].exists)
        XCTAssertFalse(app.buttons["Retake"].exists)
        enterRecovery.tap()

        let firstTarget = app.buttons["bulkRecovery.target.1"]
        let secondTarget = app.buttons["bulkRecovery.target.2"]
        XCTAssertTrue(firstTarget.waitForExistence(timeout: 3))
        XCTAssertTrue(secondTarget.waitForExistence(timeout: 3))
        firstTarget.tap()
        secondTarget.tap()

        let check = app.buttons["bulkRecovery.check"]
        XCTAssertTrue(check.waitForExistence(timeout: 3))
        XCTAssertEqual(check.label, "Check 2 figures")
    }

    func testBulkRevealUsesOneTotalAndThenOneCompletedSummary() {
        let app = XCUIApplication()
        app.launchArguments = ["-showBulkRecoveryDemo"]
        app.launch()

        let revealTotal = app.descendants(matching: .any).matching(identifier: "bulkReveal.total")
        XCTAssertTrue(revealTotal.firstMatch.waitForExistence(timeout: 8))
        XCTAssertEqual(revealTotal.count, 1)
        XCTAssertEqual(
            revealTotal.firstMatch.frame.midX,
            app.windows.firstMatch.frame.midX,
            accuracy: 28
        )
        XCTAssertGreaterThanOrEqual(revealTotal.firstMatch.frame.height, 54)
        XCTAssertEqual(
            app.descendants(matching: .any).matching(identifier: "bulkResults.summary").count,
            0
        )

        let jackpot = app.descendants(matching: .any).matching(identifier: "bulkReveal.jackpotTotal")
        XCTAssertTrue(jackpot.firstMatch.waitForExistence(timeout: 8))
        XCTAssertEqual(jackpot.count, 1)

        let completedSummary = app.descendants(matching: .any).matching(identifier: "bulkResults.summary")
        XCTAssertTrue(completedSummary.firstMatch.waitForExistence(timeout: 8))
        XCTAssertEqual(completedSummary.count, 1)
        XCTAssertFalse(revealTotal.firstMatch.exists)
    }
}
