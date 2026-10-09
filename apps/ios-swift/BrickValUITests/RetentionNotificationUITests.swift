import XCTest

@MainActor
final class RetentionNotificationUITests: XCTestCase {
    func testOnboardingInvitationKeepsGetStartedAvailable() {
        let app = XCUIApplication()
        app.launchArguments = ["-showRetentionReminderDemo", "-retentionOnboarding", "-brickval_language_override", "en"]
        app.launch()
        let start = app.buttons["onboarding.getStarted"]
        XCTAssertTrue(start.waitForExistence(timeout: 8))
        XCTAssertTrue(start.isHittable)
        XCTAssertFalse(app.alerts.firstMatch.exists)
        app.swipeUp()
        XCTAssertTrue(app.buttons["retention.enable"].waitForExistence(timeout: 3))
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "First-week onboarding reminder invitation"
        attachment.lifetime = .keepAlways
        add(attachment)
        app.buttons["retention.decline"].tap()
        app.swipeDown()
        XCTAssertTrue(start.isHittable)
        start.tap()
        XCTAssertFalse(app.buttons["retention.enable"].exists)
        XCTAssertFalse(app.alerts.firstMatch.exists)
    }

    func testDecliningInlineInvitationNeverPromptsOrRepeats() {
        let app = XCUIApplication()
        app.launchArguments = ["-showRetentionReminderDemo", "-brickval_language_override", "en"]
        app.launch()
        let invitation = app.buttons["retention.decline"]
        XCTAssertTrue(app.buttons["retention.decline"].waitForExistence(timeout: 8))
        XCTAssertFalse(app.alerts.firstMatch.exists)
        app.buttons["retention.decline"].tap()
        XCTAssertTrue(invitation.waitForNonExistence(timeout: 3))
        app.buttons["retention.demo.result"].tap()
        XCTAssertFalse(app.buttons["retention.decline"].exists)
        XCTAssertFalse(app.alerts.firstMatch.exists)
        XCTAssertTrue(app.staticTexts["First-week scan reminders"].exists)
    }

    func testHoldoutHasNoRetentionInvitation() {
        let app = XCUIApplication()
        app.launchArguments = ["-showRetentionReminderDemo", "-retentionHoldout", "-brickval_language_override", "en"]
        app.launch()
        let result = app.buttons["retention.demo.result"]
        XCTAssertTrue(result.waitForExistence(timeout: 8))
        result.tap()
        XCTAssertFalse(app.alerts.firstMatch.exists)
        XCTAssertFalse(app.buttons["retention.enable"].exists)
        XCTAssertFalse(app.staticTexts["First-week scan reminders"].exists)
    }
}
