import XCTest

@MainActor
final class RetentionNotificationUITests: XCTestCase {
    func testDecliningInvitationKeepsSettingsAndNeverRepeatsInvitation() {
        let app = XCUIApplication()
        app.launchArguments = ["-showRetentionReminderDemo", "-brickval_language_override", "en"]
        app.launch()
        let result = app.buttons["retention.demo.result"]
        XCTAssertTrue(result.waitForExistence(timeout: 8))
        XCTAssertFalse(app.alerts.firstMatch.exists)
        result.tap()
        let invitation = app.alerts["Want occasional reminders to scan and build your collection?"]
        XCTAssertTrue(invitation.waitForExistence(timeout: 4))
        XCTAssertTrue(invitation.staticTexts["At most one reminder a week, and two in 30 days. Turn them off anytime in Notifications."].exists)
        invitation.buttons["Not now"].tap()
        XCTAssertTrue(invitation.waitForNonExistence(timeout: 3))
        result.tap()
        XCTAssertFalse(invitation.exists)
        XCTAssertTrue(app.staticTexts["Scan and collection reminders"].exists)
    }

    func testHoldoutHasNoRetentionInvitation() {
        let app = XCUIApplication()
        app.launchArguments = ["-showRetentionReminderDemo", "-retentionHoldout", "-brickval_language_override", "en"]
        app.launch()
        let result = app.buttons["retention.demo.result"]
        XCTAssertTrue(result.waitForExistence(timeout: 8))
        result.tap()
        XCTAssertFalse(app.alerts.firstMatch.exists)
        XCTAssertFalse(app.staticTexts["Scan and collection reminders"].exists)
    }
}
