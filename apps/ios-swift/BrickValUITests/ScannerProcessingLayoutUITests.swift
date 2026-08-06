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
}
