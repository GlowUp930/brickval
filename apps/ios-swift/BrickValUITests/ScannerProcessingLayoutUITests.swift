import XCTest

@MainActor
final class ScannerProcessingLayoutUITests: XCTestCase {
    func testPhotoGuideShowsSeamlessExamplesAndCanDismiss() {
        let app = XCUIApplication()
        app.launchArguments = ["-showScannerPhotoGuideDemo", "-brickval_language_override", "en"]
        app.launch()

        let headline = app.staticTexts["Scan fails? Try these!"]
        XCTAssertTrue(headline.waitForExistence(timeout: 4))
        let good = app.images.matching(NSPredicate(format: "label BEGINSWITH %@", "Good:")).firstMatch
        let avoid = app.images.matching(NSPredicate(format: "label BEGINSWITH %@", "Avoid:")).firstMatch
        XCTAssertTrue(good.exists)
        XCTAssertTrue(avoid.exists)
        XCTAssertTrue(app.buttons["scanner.photoGuide.retake"].isHittable)
        XCTAssertTrue(app.buttons["scanner.photoGuide.library"].exists)
        XCTAssertFalse(app.buttons["scanner.retry"].isHittable)

        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Photo guide with edge-to-edge examples"
        screenshot.lifetime = .keepAlways
        add(screenshot)

        app.buttons["scanner.photoGuide.close"].tap()
        XCTAssertTrue(headline.waitForNonExistence(timeout: 3))
        XCTAssertTrue(app.buttons["scanner.retry"].isHittable)
        XCTAssertTrue(app.buttons["scanner.photoTips"].isHittable)
    }

    func testPhotoGuideLargeArabicTextKeepsRecoveryAvailable() {
        let app = XCUIApplication()
        app.launchArguments = [
            "-showScannerPhotoGuideDemo",
            "-brickval_language_override", "ar",
            "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL",
        ]
        app.launch()

        XCTAssertTrue(app.buttons["scanner.photoGuide.close"].waitForExistence(timeout: 4))
        let retake = app.buttons["scanner.photoGuide.retake"]
        for _ in 0..<4 where !retake.isHittable { app.swipeUp() }
        XCTAssertTrue(retake.isHittable)
        let library = app.buttons["scanner.photoGuide.library"]
        for _ in 0..<4 where !library.isHittable { app.swipeUp() }
        XCTAssertTrue(library.isHittable)
    }

    func testFailedScanRetryRespondsImmediately() {
        let app = XCUIApplication()
        app.launchArguments = ["-showScannerFailureDemo", "-brickval_language_override", "en"]
        app.launch()

        let retry = app.buttons["scanner.retry"]
        XCTAssertTrue(retry.waitForExistence(timeout: 4))
        XCTAssertTrue(retry.isHittable)
        let cameraStage = app.otherElements["scanner.cameraStage"]
        XCTAssertTrue(cameraStage.waitForExistence(timeout: 3))
        XCTAssertEqual(cameraStage.label, "Camera preview")
        let capture = app.buttons["scanner.capture"]
        XCTAssertTrue(capture.waitForExistence(timeout: 3))
        XCTAssertTrue(capture.isHittable)

        retry.tap()
        // XCTest event delivery includes simulator scheduling and accessibility
        // synchronization. A three-second bound still catches the old camera
        // actor stall while avoiding a false failure when the hosted runner
        // takes a little longer to publish the post-tap hierarchy.
        XCTAssertTrue(retry.waitForNonExistence(timeout: 3))
    }

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
        app.launchArguments = ["-showScannerProcessingLayoutDemo", "-brickval_language_override", "en"]
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
        app.launchArguments = ["-showScannerProcessingLayoutDemo", "-brickval_language_override", "en"]
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
        app.launchArguments = ["-showWideBulkProcessingLayoutDemo", "-brickval_language_override", "en"]
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
        app.launchArguments = ["-showBulkRecoveryDemo", "-brickval_language_override", "en"]
        app.launch()

        // The production reveal can spend the maximum interval on each of
        // the two fixture entries before returning to the completed screen.
        // Include the fixed reveal phases and simulator scheduling margin.
        let revealBudget = 1.60 + (2.0 * 0.75) + 1.40 + 0.45 + 10.0
        let completedSummary = app.descendants(matching: .any).matching(identifier: "bulkResults.summary").firstMatch
        XCTAssertTrue(completedSummary.waitForExistence(timeout: revealBudget))
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
        app.launchArguments = ["-showBulkRecoveryDemo", "-brickval_language_override", "en"]
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

        // The jackpot total is intentionally a short-lived animation state;
        // hosted XCTest accessibility snapshots can skip it while polling.
        // The derived reveal budget below verifies that the real sequence
        // completes and that the final summary is emitted once.
        let revealBudget = 1.60 + (2.0 * 0.75) + 1.40 + 0.45 + 10.0
        let completedSummary = app.descendants(matching: .any).matching(identifier: "bulkResults.summary")
        XCTAssertTrue(completedSummary.firstMatch.waitForExistence(timeout: revealBudget))
        XCTAssertEqual(completedSummary.count, 1)
        XCTAssertFalse(revealTotal.firstMatch.exists)
    }

    func testBulkResolvedPriceRemainsAnchoredAfterRevealCompletes() {
        let app = XCUIApplication()
        app.launchArguments = ["-showBulkRecoveryDemo", "-brickval_language_override", "en"]
        app.launch()

        // Two entries at the production maximum step interval, plus the
        // scan, jackpot, return, and a small simulator scheduling margin.
        // Keep this assertion tied to the reveal schedule rather than an
        // arbitrary timeout so hosted CI can finish accessibility rendering.
        let revealBudget = 1.60 + (2.0 * 0.75) + 1.40 + 0.45 + 10.0
        let completedSummary = app.descendants(matching: .any).matching(identifier: "bulkResults.summary").firstMatch
        XCTAssertTrue(completedSummary.waitForExistence(timeout: revealBudget))
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
        app.launchArguments = ["-showDenseBulkCompletedDemo", "-brickval_language_override", "en"]
        app.launch()

        let completedSummary = app.descendants(matching: .any).matching(identifier: "bulkResults.summary").firstMatch
        XCTAssertTrue(completedSummary.waitForExistence(timeout: 10))

        let tags = app.descendants(matching: .any)
            .matching(NSPredicate(format: "identifier BEGINSWITH %@", "bulkResults.priceCallout.dense-"))
        XCTAssertEqual(tags.count, 60)
        var identifiers = Set<String>()
        for index in 1 ... 60 {
            let tag = app.descendants(matching: .any)
                .matching(identifier: "bulkResults.priceCallout.dense-\(index)")
                .firstMatch
            XCTAssertTrue(tag.exists, "Missing dense price tag \(index)")
            identifiers.insert(tag.identifier)
            XCTAssertTrue(tag.label.contains("Figure \(index)"))
            XCTAssertTrue(tag.label.contains("price $"))
            let expectedPrice = Double(((index - 1) % 17) + 2)
            XCTAssertTrue(tag.label.contains(String(format: "%.2f", expectedPrice)))
        }
        XCTAssertEqual(identifiers.count, 60)

        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Dense bulk full price labels"
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

    func testDenseBulkRevealCompletesWithinDerivedBudget() {
        let app = XCUIApplication()
        // Keep the dense 60-item fixture dedicated to layout coverage. This
        // check exercises the production reveal schedule without coupling
        // completion to the slowest accessibility rendering of 60 labels.
        app.launchArguments = ["-showBulkRecoveryDemo", "-brickval_language_override", "en"]
        app.launch()

        // Two entries at the production maximum step interval, plus the
        // scan, jackpot, return, and an explicit hosted-accessibility margin.
        // The margin covers simulator launch/snapshot work before the reveal
        // starts; the bound still catches a genuinely stuck sequence.
        let revealBudget = 1.60 + (2.0 * 0.75) + 1.40 + 0.45 + 25.0
        let completedSummary = app.descendants(matching: .any).matching(identifier: "bulkResults.summary").firstMatch
        XCTAssertTrue(completedSummary.waitForExistence(timeout: revealBudget))
        let lastTag = app.descendants(matching: .any)
            .matching(identifier: "bulkResults.priceCallout.demo-existing-2")
            .firstMatch
        XCTAssertTrue(lastTag.waitForExistence(timeout: 3))
        XCTAssertTrue(lastTag.label.contains("Figure 2"))
        XCTAssertTrue(lastTag.label.contains("$8.25"))
        XCTAssertTrue(lastTag.label.contains("price $"))
    }

    func testProfileLanguageCanBeChangedInsideTheApp() {
        let app = XCUIApplication()
        app.launchArguments = ["-showSettingsRootDemo", "-brickval_language_override", "en"]
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

    func testArabicKeepsBottomTabsInProductOrder() {
        let app = XCUIApplication()
        app.launchArguments = ["-showSettingsRootDemo", "-brickval_language_override", "ar"]
        app.launch()

        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 5))

        let collection = tabBar.buttons["المجموعة"]
        let scan = tabBar.buttons["مسح"]
        let profile = tabBar.buttons["الملف الشخصي"]
        XCTAssertTrue(collection.waitForExistence(timeout: 3))
        XCTAssertTrue(scan.waitForExistence(timeout: 3))
        XCTAssertTrue(profile.waitForExistence(timeout: 3))

        XCTAssertLessThan(collection.frame.minX, scan.frame.minX)
        XCTAssertLessThan(scan.frame.minX, profile.frame.minX)
    }

    func testSwitchingToArabicKeepsBottomTabsInProductOrder() {
        let app = XCUIApplication()
        app.launchArguments = ["-showSettingsRootDemo", "-brickval_language_override", "en"]
        app.launch()

        let languageRow = app.descendants(matching: .any)
            .matching(identifier: "settings.language")
            .firstMatch
        XCTAssertTrue(languageRow.waitForExistence(timeout: 3))
        languageRow.tap()

        let arabic = app.buttons["العربية"].firstMatch
        for _ in 0..<8 where !arabic.isHittable {
            app.swipeUp()
        }
        XCTAssertTrue(arabic.waitForExistence(timeout: 3))
        XCTAssertTrue(arabic.isHittable)
        arabic.tap()

        let tabBar = app.tabBars.firstMatch
        XCTAssertTrue(tabBar.waitForExistence(timeout: 5))
        let collection = tabBar.buttons["المجموعة"]
        let scan = tabBar.buttons["مسح"]
        let profile = tabBar.buttons["الملف الشخصي"]
        XCTAssertTrue(collection.waitForExistence(timeout: 3))
        XCTAssertTrue(scan.waitForExistence(timeout: 3))
        XCTAssertTrue(profile.waitForExistence(timeout: 3))

        XCTAssertLessThan(collection.frame.minX, scan.frame.minX)
        XCTAssertLessThan(scan.frame.minX, profile.frame.minX)
    }

    func testScannerModeLabelsRefreshAfterLanguageSwitch() {
        let app = XCUIApplication()
        app.launchArguments = ["-showScannerDemo", "-brickval_language_override", "de"]
        app.launch()

        let modePicker = app.segmentedControls["scanner.modePicker"]
        XCTAssertTrue(modePicker.waitForExistence(timeout: 5))
        XCTAssertTrue(modePicker.buttons["Minifigur"].waitForExistence(timeout: 3))

        // The language setting is changed through the same in-app path as a
        // customer, then the scanner tab is revisited to exercise the native
        // segmented control's label refresh.
        app.tabBars.buttons.element(boundBy: 2).tap()
        let languageRow = app.descendants(matching: .any)
            .matching(identifier: "settings.language")
            .firstMatch
        XCTAssertTrue(languageRow.waitForExistence(timeout: 3))
        languageRow.tap()

        let simplifiedChinese = app.buttons["简体中文"]
        for _ in 0..<4 where !simplifiedChinese.isHittable {
            app.swipeUp()
        }
        XCTAssertTrue(simplifiedChinese.waitForExistence(timeout: 3))
        simplifiedChinese.tap()
        XCTAssertTrue(app.navigationBars["语言"].waitForExistence(timeout: 3))

        app.navigationBars.buttons.element(boundBy: 0).tap()
        app.tabBars.buttons.element(boundBy: 1).tap()

        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Scanner after Simplified Chinese switch"
        screenshot.lifetime = .keepAlways
        add(screenshot)

        XCTAssertEqual(
            modePicker.buttons.allElementsBoundByIndex.map(\.label),
            ["小人仔", "批量"],
            "Mode picker labels after language switch"
        )

        XCTAssertTrue(modePicker.waitForExistence(timeout: 3))
        XCTAssertTrue(modePicker.buttons["小人仔"].waitForExistence(timeout: 3))
        XCTAssertTrue(modePicker.buttons["批量"].waitForExistence(timeout: 3))
        XCTAssertFalse(modePicker.buttons["Minifigur"].exists)
        XCTAssertFalse(modePicker.buttons["Schüttgut"].exists)
    }

    func testProfileCurrencyCanBeChangedInsideTheApp() {
        let app = XCUIApplication()
        app.launchArguments = ["-showSettingsRootDemo", "-brickval_language_override", "en"]
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

    func testProductionRootShowsPurchaseRestrictionGuide() {
        let app = XCUIApplication()
        app.launchArguments = [
            "-AppleLanguages", "(en)",
            "-AppleLocale", "en_US",
            "-brickval_language_override", "en",
            "-showPurchaseFailureRootDemo",
        ]
        app.launch()

        XCTAssertTrue(app.staticTexts["Let's check purchase settings"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Allow in-app purchases"].exists)
        XCTAssertTrue(app.buttons["Check again"].exists)
        XCTAssertFalse(app.staticTexts["The device or user is not allowed to make the purchase."].exists)
    }

    func testLockedBulkPreviewRevealsPlaceholdersAndRoutesToReferrals() {
        let app = XCUIApplication()
        app.launchArguments = ["-showLockedBulkPreviewDemo", "-brickval_language_override", "en"]
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
