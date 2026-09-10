import XCTest

@MainActor
final class ScannerProcessingLayoutUITests: XCTestCase {
    func testOnboardingGetStartedRespondsWithoutStartupDelay() {
        let app = XCUIApplication()
        app.launchArguments = ["-showOnboardingDemo", "-brickval_language_override", "en"]
        app.launch()

        let getStarted = app.buttons["onboarding.getStarted"]
        XCTAssertTrue(getStarted.waitForExistence(timeout: 4))
        XCTAssertTrue(getStarted.isHittable)

        getStarted.tap()
        let detailContinue = app.buttons["onboarding.detailContinue"]
        Thread.sleep(forTimeInterval: 0.25)
        XCTAssertTrue(detailContinue.exists)
        XCTAssertTrue(detailContinue.isHittable)
    }

    func testSettingsDoesNotExposeTemporaryOnboardingPreview() {
        let app = XCUIApplication()
        app.launchArguments = ["-showSettingsRootDemo", "-brickval_language_override", "en"]
        app.launch()

        let previewButton = app.buttons["settings.hardPaywallOnboardingPreview"]
        XCTAssertFalse(previewButton.waitForExistence(timeout: 2))
    }

    func testExistingCollectionFetchesRealHistoryAndChangesTimeframe() {
        let app = XCUIApplication()
        app.launchArguments = ["-showCollectionHistoryDemo", "-showProGatingDemo", "-brickval_language_override", "en", "-brickval_collection_tips_seen", "NO"]
        app.launch()
        let tips = app.buttons["Got it"]
        guard tips.waitForExistence(timeout: 5) else { XCTFail("Expected first-launch collection tips"); return }
        tips.tap()
        let month = app.descendants(matching: .any).matching(NSPredicate(format: "identifier BEGINSWITH %@", "collection.valueChart.1M.")).firstMatch
        XCTAssertTrue(month.waitForExistence(timeout: 15))
        let monthCount = Int(month.identifier.split(separator: ".").last ?? "0") ?? 0
        XCTAssertGreaterThan(monthCount, 2)
        let quarterButton = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Show 3M price history")).firstMatch
        // Scroll in the outer margin, away from the chart's touch-inspection gesture.
        // Do not ask XCTest to synthesize a tap until the control is actually reachable.
        for _ in 0..<6 where !quarterButton.isHittable {
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.75))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.35)))
        }
        guard quarterButton.isHittable else { XCTFail("3M control must be visible before tapping"); return }
        quarterButton.tap()
        let quarter = app.descendants(matching: .any).matching(NSPredicate(format: "identifier BEGINSWITH %@", "collection.valueChart.3M.")).firstMatch
        for _ in 0..<6 {
            if quarter.exists && quarter.frame.minY >= 0 { break }
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.35))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.75)))
        }
        guard quarter.waitForExistence(timeout: 5) else { XCTFail("Expected real 3M graph after selection"); return }
        XCTAssertGreaterThan(Int(quarter.identifier.split(separator: ".").last ?? "0") ?? 0, monthCount)
        quarter.coordinate(withNormalizedOffset: CGVector(dx: 0.2, dy: 0.4))
            .press(forDuration: 0.3, thenDragTo: quarter.coordinate(withNormalizedOffset: CGVector(dx: 0.7, dy: 0.4)), withVelocity: .slow, thenHoldForDuration: 1)
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Collection real market history"
        screenshot.lifetime = .keepAlways
        add(screenshot)
        let item = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Tintin Moon Rocket")).firstMatch
        for _ in 0..<8 where !item.isHittable {
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.75))
                .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.35)))
        }
        guard item.isHittable else { XCTFail("Tintin item must be visible before tapping"); return }
        item.tap()
        let detail = app.descendants(matching: .any).matching(NSPredicate(format: "identifier BEGINSWITH %@", "collectionItem.valueChart.")).firstMatch
        for _ in 0..<8 {
            if detail.exists && detail.frame.minY >= 0 && detail.frame.maxY < app.windows.firstMatch.frame.height * 0.85 { break }
            app.swipeUp()
        }
        XCTAssertTrue(detail.waitForExistence(timeout: 5))
        XCTAssertGreaterThanOrEqual(detail.frame.minY, 0)
        XCTAssertLessThan(detail.frame.maxY, app.windows.firstMatch.frame.height * 0.85)
        XCTAssertGreaterThan(Int(detail.identifier.split(separator: ".").last ?? "0") ?? 0, 1)
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "collectionItem.soldListingsLegend").firstMatch.waitForExistence(timeout: 3))
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "collectionItem.marketSnapshot.1M").firstMatch.waitForExistence(timeout: 3))
        XCTAssertFalse(app.staticTexts["Estimated market history"].isHittable)
        let detailQuarterButton = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Show 3M price history")).firstMatch
        for _ in 0..<8 where !detailQuarterButton.isHittable { app.swipeUp() }
        XCTAssertTrue(detailQuarterButton.isHittable)
        detailQuarterButton.tap()
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "collectionItem.marketSnapshot.3M").firstMatch.waitForExistence(timeout: 3))
        let detailScreenshot = XCTAttachment(screenshot: app.screenshot())
        detailScreenshot.name = "Item real market history"
        detailScreenshot.lifetime = .keepAlways
        add(detailScreenshot)
    }

    func testMarketHistoryLargeTextControlsRemainReachable() {
        let app = XCUIApplication()
        app.launchArguments = ["-showCollectionHistoryDemo", "-showProGatingDemo", "-brickval_language_override", "en", "-brickval_collection_tips_seen", "NO", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        let tips = app.buttons["Got it"]
        guard tips.waitForExistence(timeout: 5) else { XCTFail("Expected first-launch collection tips"); return }
        tips.tap()
        let chart = app.descendants(matching: .any).matching(NSPredicate(format: "identifier BEGINSWITH %@", "collection.valueChart.")).firstMatch
        XCTAssertTrue(chart.waitForExistence(timeout: 15))
        let half = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Show 6M price history")).firstMatch
        for _ in 0..<4 where !half.isHittable { app.swipeUp() }
        XCTAssertTrue(half.isHittable)
        half.tap()
        XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "identifier BEGINSWITH %@", "collection.valueChart.6M.")).firstMatch.waitForExistence(timeout: 5))
        let largeText = XCTAttachment(screenshot: app.screenshot())
        largeText.name = "Market history largest text"
        largeText.lifetime = .keepAlways
        add(largeText)
    }

    func testBulkAccessibilityControlsRemainReachable() {
        let app = XCUIApplication()
        app.launchArguments = ["-showBulkRecoveryDemo", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL", "-brickval_language_override", "en"]
        app.launch()
        let summary = app.descendants(matching: .any).matching(identifier: "bulkResults.summary").firstMatch
        for _ in 0..<3 where !summary.waitForExistence(timeout: 2) { app.swipeUp() }
        XCTAssertTrue(summary.waitForExistence(timeout: 3))
        let addButton = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Add ")).firstMatch
        for _ in 0..<6 where !addButton.isHittable { app.swipeUp() }
        XCTAssertTrue(addButton.isHittable)
        XCTAssertGreaterThanOrEqual(addButton.frame.height, 44)
        XCTAssertLessThanOrEqual(addButton.frame.maxX, app.windows.firstMatch.frame.maxX)
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Bulk largest Dynamic Type"
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

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

    func testSingleScanExplainsAveragePriceAfterProcessingPause() {
        let app = XCUIApplication()
        app.launchArguments = ["-showScannerProcessingLayoutDemo"]
        app.launch()

        let status = app.descendants(matching: .any)
            .matching(identifier: "scanner.processing.status")
            .firstMatch
        XCTAssertTrue(status.waitForExistence(timeout: 5))

        let predicate = NSPredicate(format: "label CONTAINS %@", "Calculating the average market price")
        let expectation = XCTNSPredicateExpectation(predicate: predicate, object: status)
        XCTAssertEqual(XCTWaiter().wait(for: [expectation], timeout: 4), .completed)
    }

    func testWideBulkProcessingFitsPhotoAndStatusInsideScannerStage() {
        let app = XCUIApplication()
        app.launchArguments = ["-showWideBulkProcessingLayoutDemo"]
        app.launch()

        let cameraStage = app.otherElements["scanner.cameraStage"]
        let status = app.descendants(matching: .any)
            .matching(identifier: "scanner.bulkProcessing.status")
            .firstMatch

        XCTAssertTrue(cameraStage.waitForExistence(timeout: 3))
        XCTAssertTrue(status.waitForExistence(timeout: 3))
        XCTAssertGreaterThan(status.frame.height, 44)
        XCTAssertGreaterThanOrEqual(status.frame.minX, cameraStage.frame.minX)
        XCTAssertLessThanOrEqual(status.frame.maxX, cameraStage.frame.maxX)
        XCTAssertGreaterThanOrEqual(status.frame.minY, cameraStage.frame.minY)
        XCTAssertLessThanOrEqual(status.frame.maxY, cameraStage.frame.maxY)
        XCTAssertLessThanOrEqual(cameraStage.frame.maxY, app.otherElements["scanner.controls"].frame.minY)
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

    func testBulkResolvedPriceRemainsAnchoredAfterRevealCompletes() {
        let app = XCUIApplication()
        app.launchArguments = ["-showBulkRecoveryDemo"]
        app.launch()

        let completedSummary = app.descendants(matching: .any).matching(identifier: "bulkResults.summary").firstMatch
        XCTAssertTrue(completedSummary.waitForExistence(timeout: 12))
        XCTAssertTrue(app.images["bulkResults.appIcon"].exists)
        XCTAssertTrue(app.staticTexts["BrickValue"].exists)
        XCTAssertFalse(app.staticTexts["BrickVal"].exists)

        let priceCallout = app.descendants(matching: .any)
            .matching(identifier: "bulkResults.priceCallout.demo-existing")
            .firstMatch
        XCTAssertTrue(priceCallout.waitForExistence(timeout: 3))
        XCTAssertTrue(priceCallout.label.contains("$5.14"))
        XCTAssertTrue(priceCallout.label.contains("USD"))

        let secondPriceCallout = app.descendants(matching: .any)
            .matching(identifier: "bulkResults.priceCallout.demo-existing-2")
            .firstMatch
        XCTAssertTrue(secondPriceCallout.exists)
        XCTAssertTrue(secondPriceCallout.label.contains("$8.25"))
        XCTAssertTrue(secondPriceCallout.label.contains("USD"))
    }

    func testDenseBulkPricesKeepEveryFigureVisible() {
        let app = XCUIApplication()
        app.launchArguments = ["-showDenseBulkRecoveryDemo"]
        app.launch()

        let completedSummary = app.descendants(matching: .any).matching(identifier: "bulkResults.summary").firstMatch
        XCTAssertTrue(completedSummary.waitForExistence(timeout: 35))

        let tags = app.descendants(matching: .any)
            .matching(NSPredicate(format: "identifier BEGINSWITH %@", "bulkResults.priceCallout.dense-"))
        XCTAssertEqual(tags.count, 60)
        XCTAssertTrue(tags.element(boundBy: 0).label.contains("Figure 1"))
        XCTAssertTrue(tags.element(boundBy: 59).label.contains("Figure 60"))
        for index in 0 ..< tags.count {
            XCTAssertTrue(tags.element(boundBy: index).label.contains("price $"))
        }

        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Dense bulk full price labels"
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

    func testProfileLanguageCanBeChangedInsideTheApp() {
        let app = XCUIApplication()
        app.launchArguments = ["-showSettingsRootDemo"]
        app.launch()

        let languageRow = app.descendants(matching: .any)
            .matching(identifier: "settings.language")
            .firstMatch
        XCTAssertTrue(languageRow.waitForExistence(timeout: 3))
        languageRow.tap()

        XCTAssertTrue(app.navigationBars["Language"].waitForExistence(timeout: 3))
        let japanese = app.buttons["日本語"].firstMatch
        XCTAssertTrue(japanese.waitForExistence(timeout: 3))
        japanese.tap()
        XCTAssertTrue(japanese.isSelected)
        XCTAssertTrue(app.navigationBars["言語"].waitForExistence(timeout: 3))

        // English is a stable native label in every supported locale and
        // leaves the simulator in the deterministic language used by the UI suite.
        let english = app.buttons["English"].firstMatch
        XCTAssertTrue(english.waitForExistence(timeout: 3))
        english.tap()
    }

    func testProfileCurrencyCanBeChangedInsideTheApp() {
        let app = XCUIApplication()
        app.launchArguments = ["-showSettingsRootDemo"]
        app.launch()

        let currencyRow = app.descendants(matching: .any)
            .matching(identifier: "settings.currency")
            .firstMatch
        XCTAssertTrue(currencyRow.waitForExistence(timeout: 3))
        currencyRow.tap()

        XCTAssertTrue(app.navigationBars["Currency"].waitForExistence(timeout: 3))
        let jpy = app.buttons.matching(NSPredicate(format: "label CONTAINS 'JPY'")).firstMatch
        XCTAssertTrue(jpy.waitForExistence(timeout: 3))
        jpy.tap()
        XCTAssertTrue(jpy.isSelected)

        let systemDefault = app.buttons["System default"].firstMatch
        XCTAssertTrue(systemDefault.waitForExistence(timeout: 3))
        systemDefault.tap()
        XCTAssertTrue(systemDefault.isSelected)
    }

    func testProductionRootShowsNormalizedPurchaseFailure() {
        let app = XCUIApplication()
        app.launchArguments = ["-showPurchaseFailureRootDemo"]
        app.launch()

        let alert = app.alerts.firstMatch
        XCTAssertTrue(alert.waitForExistence(timeout: 5))
        XCTAssertGreaterThanOrEqual(alert.staticTexts.count, 2)
        let alertText = alert.staticTexts.allElementsBoundByIndex.map(\.label).joined(separator: " ")
        XCTAssertFalse(alertText.contains("The device or user is not allowed to make the purchase."))
    }

    func testLockedBulkPreviewRevealsPlaceholdersAndRoutesToReferrals() {
        let app = XCUIApplication()
        app.launchArguments = ["-showLockedBulkPreviewDemo"]
        app.launch()

        XCTAssertTrue(app.otherElements["bulkPreview.locked"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.buttons["bulkPreview.upgrade"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["bulkPreview.refer"].exists)
        let firstPlaceholder = app.descendants(matching: .any)
            .matching(identifier: "bulkPreview.placeholderCard.demo-existing")
            .firstMatch
        XCTAssertTrue(firstPlaceholder.waitForExistence(timeout: 3))
        XCTAssertGreaterThanOrEqual(
            app.descendants(matching: .any).matching(identifier: "bulkPreview.placeholderCard.demo-existing").count,
            1
        )

        app.buttons["bulkPreview.refer"].tap()
        XCTAssertTrue(app.navigationBars["Invite friends"].waitForExistence(timeout: 3))
    }
}
