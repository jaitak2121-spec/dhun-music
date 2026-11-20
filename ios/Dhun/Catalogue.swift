import Foundation
import DhunCore
import YouTubeKit

actor Catalogue {
    private let session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 15; config.timeoutIntervalForResource = 25
        config.httpAdditionalHeaders = ["User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9"]
        return URLSession(configuration: config)
    }()
    func search(_ query: String) async throws -> [Track] {
        let query = String(query.trimmingCharacters(in: .whitespacesAndNewlines).prefix(150))
        guard !query.isEmpty else { return [] }
        var url = URLComponents(string: "https://www.youtube.com/results")!
        url.queryItems = [.init(name: "search_query", value: query + " music"), .init(name: "sp", value: "EgIQAQ==")]
        return Array(CatalogueParser.tracks(try CatalogueParser.initialJSON(try await html(url.url!))).prefix(30))
    }
    func playlist(_ link: String) async throws -> [Track] {
        let id = try CatalogueParser.playlistID(link)
        let json = try CatalogueParser.initialJSON(try await html(URL(string: "https://www.youtube.com/playlist?list=\(id)")!))
        let tracks = CatalogueParser.tracks(json, playlistOnly: true)
        guard !tracks.isEmpty else { throw DhunError.message("No accessible tracks found. The playlist may be private or unavailable.") }
        // ponytail: import the first public page, with an explicit preview before saving.
        return Array(tracks.prefix(100))
    }
    func spotifyPlaylist(_ link: String) async throws -> [Track] {
        let id = try SpotifyPreview.playlistID(link)
        let targets = try SpotifyPreview.tracks(try await html(URL(string: "https://open.spotify.com/embed/playlist/\(id)")!))
        var matches: [Track] = [], seen = Set<String>()
        // ponytail: first 20 preview tracks, matched conservatively and reviewed before saving.
        for target in targets.prefix(20) {
            try Task.checkCancellation()
            if let found = try? await search("\(target.artist) \(target.title)"), let match = SpotifyPreview.match(target, candidates: found), seen.insert(match.id).inserted { matches.append(match) }
        }
        guard !matches.isEmpty else { throw DhunError.message("No confident song matches found in this public preview.") }; return matches
    }
    func stream(_ track: Track) async throws -> URL {
        guard Track.validVideoID(track.id) else { throw DhunError.message("This track is unavailable.") }
        // Local extraction only: never route device requests through the library's remote proxy.
        let streams = try await YouTube(videoID: track.id, methods: [.local]).streams
        guard let stream = streams.filterAudioOnly().filter({ $0.fileExtension == .m4a && $0.isNativelyPlayable }).highestAudioBitrateStream() else {
            throw DhunError.message("No playable audio is available for this recording. Try another result.")
        }
        try await stream.waitUntilAvailable()
        guard stream.url.scheme == "https", stream.url.host?.hasSuffix(".googlevideo.com") == true else { throw DhunError.message("The music source returned an unsupported stream.") }
        return stream.url
    }
    func lyrics(_ track: Track) async throws -> String {
        var url = URLComponents(string: "https://lrclib.net/api/get")!
        url.queryItems = [.init(name: "track_name", value: track.title), .init(name: "artist_name", value: track.artist)]
        let (data, response) = try await session.data(from: url.url!)
        guard (response as? HTTPURLResponse)?.statusCode == 200, data.count < 1_000_000,
              let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw DhunError.message("Lyrics aren't available for this recording.") }
        if json["instrumental"] as? Bool == true { return "Instrumental" }
        let lyrics = json["syncedLyrics"] as? String ?? json["plainLyrics"] as? String ?? ""
        guard !lyrics.isEmpty else { throw DhunError.message("Lyrics aren't available for this recording.") }; return lyrics
    }
    private func html(_ url: URL) async throws -> String {
        let (data, response) = try await session.data(from: url)
        guard (response as? HTTPURLResponse)?.statusCode == 200, data.count <= 8_000_000, let text = String(data: data, encoding: .utf8) else { throw DhunError.message("The music source is temporarily unavailable.") }
        return text
    }
}
