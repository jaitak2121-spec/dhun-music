import XCTest
final class DhunUITests: XCTestCase {
    @MainActor func testLibraryAndPlayback() throws {
        let app = XCUIApplication(); app.launchArguments = ["--ui-testing"]; app.launch()
        XCTAssertTrue(app.staticTexts["Find your next favourite"].waitForExistence(timeout: 15))
        screenshot("01-Home")
        app.tabBars.buttons["Library"].tap(); app.buttons["newPlaylist"].tap()
        app.alerts.textFields.firstMatch.tap(); app.alerts.textFields.firstMatch.typeText("Evening mix"); app.alerts.buttons["Create"].tap()
        XCTAssertTrue(app.staticTexts["Evening mix"].waitForExistence(timeout: 3)); screenshot("02-Library")
        app.tabBars.buttons["Home"].tap(); app.buttons["home-demo-local"].tap()
        XCTAssertTrue(app.buttons["openPlayer"].waitForExistence(timeout: 5)); app.buttons["openPlayer"].tap()
        XCTAssertTrue(app.navigationBars["Now playing"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["playerToggle"].waitForExistence(timeout: 8));
        let progress = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label != %@", "0:00"), object: app.staticTexts["playerElapsed"])
        XCTAssertEqual(XCTWaiter.wait(for: [progress], timeout: 8), .completed)
        app.buttons["playerToggle"].tap(); XCTAssertEqual(app.buttons["playerToggle"].label, "Play")
        app.buttons["Like song"].tap(); screenshot("03-Player")
        app.buttons["Close"].tap()
        let dismissed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: app.navigationBars["Now playing"])
        XCTAssertEqual(XCTWaiter.wait(for: [dismissed], timeout: 5), .completed)
        app.tabBars.buttons["Library"].tap()
        XCTAssertTrue(app.navigationBars["Library"].waitForExistence(timeout: 5))
        let liked = app.buttons["likedSongs"]
        XCTAssertTrue(liked.waitForExistence(timeout: 5)); XCTAssertEqual(liked.value as? String, "1"); liked.tap()
        XCTAssertTrue(app.buttons["Play Your everyday soundtrack"].waitForExistence(timeout: 5))
    }
    @MainActor private func screenshot(_ name: String) { let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot()); image.name = name; image.lifetime = .keepAlways; add(image) }
}
