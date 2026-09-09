import XCTest

@MainActor
final class CollectionPerformanceUITests: XCTestCase {
    func testWarmTimeframesAndNavigationWith200Holdings() {
        let app = XCUIApplication()
        app.launchArguments = ["-showCollectionHistoryDemo", "-showProGatingDemo", "-brickval_language_override", "en",
                               "-brickval_collection_tips_seen", "YES", "-collectionPerformanceHoldings", "200", "-profileCollectionPerformance"]
        app.launch()
        let chart = app.descendants(matching: .any).matching(NSPredicate(format: "identifier BEGINSWITH %@", "collection.valueChart.")).firstMatch
        XCTAssertTrue(chart.waitForExistence(timeout: 10))
        // Keep controls reachable on the smallest device without dragging through the chart.
        let quarter = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Show 3M price history")).firstMatch
        for _ in 0..<4 where !quarter.isHittable { marginScroll(app, up: true) }
        for index in 0..<21 {
            let horizon = ["3M", "6M", "1M"][index % 3]
            let button = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Show \(horizon) price history")).firstMatch
            XCTAssertTrue(button.isHittable)
            button.tap()
            XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "identifier BEGINSWITH %@", "collection.valueChart.\(horizon).")).firstMatch.waitForExistence(timeout: 2))
        }
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "200 holdings warm chart"
        attachment.lifetime = .keepAlways
        add(attachment)
        let item = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Tintin Moon Rocket")).firstMatch
        for _ in 0..<3 { marginScroll(app, up: true) }
        for _ in 0..<3 { marginScroll(app, up: false) }
        for _ in 0..<6 where !item.isHittable { marginScroll(app, up: true) }
        XCTAssertTrue(item.isHittable)
        item.tap()
        let detail = app.descendants(matching: .any).matching(NSPredicate(format: "identifier BEGINSWITH %@", "collectionItem.valueChart.")).firstMatch
        XCTAssertTrue(detail.waitForExistence(timeout: 5))
        // Wait for the destination before testing reachability. During navigation,
        // the outgoing Collection still exposes a hittable timeframe control.
        for _ in 0..<6 where !quarter.isHittable { marginScroll(app, up: true) }
        for index in 0..<21 {
            let horizon = ["3M", "6M", "1M"][index % 3]
            let button = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Show \(horizon) price history")).firstMatch
            XCTAssertTrue(button.isHittable)
            button.tap()
        }
        detail.coordinate(withNormalizedOffset: CGVector(dx: 0.2, dy: 0.5))
            .press(forDuration: 0.2, thenDragTo: detail.coordinate(withNormalizedOffset: CGVector(dx: 0.8, dy: 0.5)))
        let detailAttachment = XCTAttachment(screenshot: app.screenshot())
        detailAttachment.name = "200 holdings item chart inspection"
        detailAttachment.lifetime = .keepAlways
        add(detailAttachment)
        let used = app.buttons["Used"]
        for _ in 0..<6 where !used.isHittable { marginScroll(app, up: false) }
        XCTAssertTrue(used.isHittable)
        used.tap()
        XCTAssertTrue(used.isSelected)
        app.buttons["New"].tap()
        XCTAssertTrue(app.buttons["New"].isSelected)
    }

    private func marginScroll(_ app: XCUIApplication, up: Bool) {
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: up ? 0.8 : 0.3))
            .press(forDuration: 0.03, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: up ? 0.3 : 0.8)))
    }
}
