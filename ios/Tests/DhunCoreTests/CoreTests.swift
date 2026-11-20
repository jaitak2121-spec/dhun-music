import XCTest
@testable import DhunCore
final class CoreTests: XCTestCase {
    func testCatalogueBoundaries() throws {
        let html = #"prefix var ytInitialData = {"contents":[{"videoRenderer":{"videoId":"abcdefghijk","title":{"runs":[{"text":"Song { \"name\" }"}]},"ownerText":{"simpleText":"Artist"},"lengthText":{"simpleText":"3:12"}}},{"videoRenderer":{"videoId":"abcdefghijk"}}]}; suffix"#
        let tracks = CatalogueParser.tracks(try CatalogueParser.initialJSON(html))
        XCTAssertEqual(tracks.count, 1); XCTAssertEqual(tracks[0].duration, 192)
        XCTAssertTrue(CatalogueParser.tracks(try CatalogueParser.initialJSON(html), playlistOnly: true).isEmpty)
        XCTAssertThrowsError(try CatalogueParser.initialJSON("missing"))
        XCTAssertEqual(try CatalogueParser.playlistID("https://music.youtube.com/playlist?list=PLabcdefghijk"), "PLabcdefghijk")
        for url in ["https://evil.example/playlist?list=PLabcdefghijk", "https://youtube.com@evil.example/playlist?list=PLabcdefghijk", "http://youtube.com/playlist?list=PLabcdefghijk", "https://youtube.com/playlist?list=PLabcdefghijk&list=PLabcdefghijk"] { XCTAssertThrowsError(try CatalogueParser.playlistID(url)) }
    }
    func testSpotifyBoundariesAndMatching() throws {
        XCTAssertEqual(try SpotifyPreview.playlistID("https://open.spotify.com/playlist/1234567890123456789012"), "1234567890123456789012")
        XCTAssertThrowsError(try SpotifyPreview.playlistID("https://evil.example/playlist/1234567890123456789012"))
        let target = Track(id: "spotify:track:123", title: "My Song", artist: "Artist", duration: 180)
        XCTAssertNil(SpotifyPreview.match(target, candidates: [Track(id: "abcdefghijk", title: "My Song", artist: "Someone else", duration: 180)]))
        XCTAssertNotNil(SpotifyPreview.match(target, candidates: [Track(id: "abcdefghijk", title: "My Song (Official Audio)", artist: "Artist", duration: 185)]))
    }
    func testQueueDiversityAndPersistence() throws {
        let seed = Track(id: "abcdefghijk", title: "My Song (Official Audio)", artist: "A")
        let candidates = [Track(id: "12345678901", title: "My Song [Lyrics]", artist: "A"), Track(id: "12345678902", title: "Other (Slowed)", artist: "A")] + (1...8).map { Track(id: "track\($0)", title: "New \($0)", artist: "B") }
        let station = CatalogueParser.station(candidates, excluding: [seed])
        XCTAssertEqual(station.count, 3); XCTAssertFalse(station.contains { $0.family == seed.family })
        var library = Library(); library.playlists = [Playlist(name: "My playlist", tracks: [seed])]
        XCTAssertEqual(try JSONDecoder().decode(Library.self, from: JSONEncoder().encode(library)).playlists[0].tracks, [seed])
        XCTAssertEqual(LyricLine.parse("[00:01.5][00:03.00]Hello\n[ar:artist]").map(\.time), [1.5, 3])
    }
}
