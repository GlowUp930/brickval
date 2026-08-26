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

    func testBulkCorrectionUsesDetectedFigureContext() {
        let app = XCUIApplication()
        app.launchArguments = ["-showBulkRecoveryDemo"]
        app.launch()

        let completedSummary = app.descendants(matching: .any).matching(identifier: "bulkResults.summary").firstMatch
        XCTAssertTrue(completedSummary.waitForExistence(timeout: 12))
        XCTAssertFalse(app.buttons["bulkRecovery.enter"].exists)
        XCTAssertFalse(app.buttons["Missed"].exists)
        XCTAssertFalse(app.buttons["Skip"].exists)
        XCTAssertFalse(app.buttons["Retake"].exists)

        let detectedFigure = app.buttons["bulkMatch.region.demo-existing"]
        XCTAssertTrue(detectedFigure.waitForExistence(timeout: 3))
        XCTAssertGreaterThanOrEqual(detectedFigure.frame.width, 44)
        detectedFigure.tap()

        XCTAssertTrue(app.otherElements["bulkMatch.sheet"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.buttons["bulkMatch.noneMatch"].exists)
        app.buttons["Done"].tap()

        let resultCard = app.buttons["Change match for Spider-Man"]
        XCTAssertTrue(resultCard.waitForExistence(timeout: 3))
        resultCard.tap()
        XCTAssertTrue(app.otherElements["bulkMatch.sheet"].waitForExistence(timeout: 3))
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
