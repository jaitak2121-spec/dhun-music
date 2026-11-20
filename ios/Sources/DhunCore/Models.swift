import Foundation

public struct Track: Codable, Hashable, Identifiable, Sendable {
    public var id: String
    public var title: String
    public var artist: String
    public var duration: Double
    public var localFile: String?
    public init(id: String, title: String, artist: String, duration: Double = 0, localFile: String? = nil) {
        self.id = id; self.title = title; self.artist = artist; self.duration = duration; self.localFile = localFile
    }
    public var artwork: URL? { localFile == nil && Self.validVideoID(id) ? URL(string: "https://i.ytimg.com/vi/\(id)/hqdefault.jpg") : nil }
    public static func validVideoID(_ value: String) -> Bool { value.range(of: "^[A-Za-z0-9_-]{11}$", options: .regularExpression) != nil }
    public var family: String {
        title.lowercased().replacingOccurrences(of: #"\([^)]*\)|\[[^\]]*\]|\b(official|audio|video|lyrics|lyric|hd|4k|visualizer)\b"#, with: "", options: .regularExpression).replacingOccurrences(of: #"[^\p{L}\p{N}]+"#, with: " ", options: .regularExpression).trimmingCharacters(in: .whitespaces)
    }
}
public struct Playlist: Codable, Identifiable, Sendable {
    public var id = UUID()
    public var name: String
    public var tracks: [Track]
    public init(name: String, tracks: [Track] = []) { self.name = name; self.tracks = tracks }
}
public struct Library: Codable, Sendable {
    public var favourites: [Track] = []
    public var playlists: [Playlist] = []
    public var downloads: [Track] = []
    public var recents: [Track] = []
    public var theme = "monochrome"
    public var language = "Any"
    public var mood = "Chill"
    public init() {}
}
public enum DhunError: LocalizedError {
    case message(String)
    public var errorDescription: String? { if case let .message(text) = self { return text }; return nil }
}
public enum CatalogueParser {
    public static func initialJSON(_ html: String) throws -> Any {
        for marker in ["var ytInitialData =", "window[\"ytInitialData\"] =", "ytInitialData ="] {
            guard let range = html.range(of: marker), let start = html[range.upperBound...].firstIndex(of: "{") else { continue }
            var depth = 0, quoted = false, escaped = false
            for index in html[start...].indices {
                let char = html[index]
                if quoted { if escaped { escaped = false } else if char == "\\" { escaped = true } else if char == "\"" { quoted = false } }
                else if char == "\"" { quoted = true }
                else if char == "{" { depth += 1 }
                else if char == "}" { depth -= 1; if depth == 0 { return try JSONSerialization.jsonObject(with: Data(html[start...index].utf8)) } }
            }
        }
        throw DhunError.message("The music source did not return a catalogue. Please try again.")
    }
    public static func text(_ value: Any?) -> String {
        guard let object = value as? [String: Any] else { return "" }
        return object["simpleText"] as? String ?? (object["runs"] as? [[String: Any]] ?? []).compactMap { $0["text"] as? String }.joined()
    }
    public static func tracks(_ json: Any, playlistOnly: Bool = false) -> [Track] {
        var found: [Track] = [], seen = Set<String>()
        func visit(_ node: Any) {
            if let array = node as? [Any] { array.forEach(visit); return }
            guard let object = node as? [String: Any] else { return }
            for key in playlistOnly ? ["playlistVideoRenderer"] : ["videoRenderer", "compactVideoRenderer"] {
                if let row = object[key] as? [String: Any], let id = row["videoId"] as? String, Track.validVideoID(id), row["isPlayable"] as? Bool != false, seen.insert(id).inserted {
                    let title = text(row["title"]), artist = text(row["ownerText"] ?? row["shortBylineText"] ?? row["longBylineText"])
                    let duration = text(row["lengthText"]).split(separator: ":").reduce(0.0) { $0 * 60 + (Double($1) ?? 0) }
                    if !title.isEmpty { found.append(Track(id: id, title: title, artist: artist, duration: duration)) }
                }
            }
            for key in object.keys.sorted() { if let child = object[key] { visit(child) } }
        }
        visit(json); return found
    }
    public static func playlistID(_ input: String) throws -> String {
        guard let url = URLComponents(string: input.trimmingCharacters(in: .whitespacesAndNewlines)), url.scheme == "https", url.user == nil, url.password == nil, url.port == nil || url.port == 443,
              ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].contains(url.host?.lowercased() ?? ""),
              ["/playlist", "/playlist/", "/watch"].contains(url.path) || url.host == "youtu.be" else { throw DhunError.message("Paste a public YouTube or YouTube Music playlist link.") }
        let ids = (url.queryItems ?? []).filter { $0.name == "list" }.compactMap(\.value)
        guard ids.count == 1, ids[0].range(of: "^[A-Za-z0-9_-]{10,100}$", options: .regularExpression) != nil else { throw DhunError.message("Copy the playlist's full share link.") }
        return ids[0]
    }
    public static func station(_ candidates: [Track], excluding: [Track], limit: Int = 20) -> [Track] {
        var families = Set(excluding.map(\.family)), artists: [String: Int] = [:], result: [Track] = []
        for track in candidates where track.localFile == nil && (track.duration == 0 || track.duration <= 900) {
            let lower = track.title.lowercased()
            if ["slowed", "sped up", "nightcore", "karaoke", "cover", "remix"].contains(where: lower.contains) { continue }
            let artist = track.artist.lowercased()
            guard !track.family.isEmpty, families.insert(track.family).inserted, artists[artist, default: 0] < 3 else { continue }
            result.append(track); artists[artist, default: 0] += 1
            if result.count >= limit { break }
        }
        return result
    }
}
public struct LyricLine: Identifiable, Equatable, Sendable {
    public let time: Double
    public let text: String
    public var id: String { "\(time)-\(text)" }
    public init(time: Double, text: String) { self.time = time; self.text = text }
    public static func parse(_ lrc: String) -> [LyricLine] {
        let regex = try! NSRegularExpression(pattern: #"\[(\d+):(\d+(?:\.\d+)?)\]"#)
        return lrc.components(separatedBy: .newlines).flatMap { line -> [LyricLine] in
            let string = line as NSString, matches = regex.matches(in: line, range: NSRange(location: 0, length: string.length))
            guard let last = matches.last else { return [] }
            let text = string.substring(from: NSMaxRange(last.range)).trimmingCharacters(in: .whitespaces)
            return matches.map { LyricLine(time: (Double(string.substring(with: $0.range(at: 1))) ?? 0) * 60 + (Double(string.substring(with: $0.range(at: 2))) ?? 0), text: text) }
        }.sorted { $0.time < $1.time }
    }
}

public enum SpotifyPreview {
    public static func playlistID(_ value: String) throws -> String {
        guard let parts = URLComponents(string: value.trimmingCharacters(in: .whitespacesAndNewlines)), parts.scheme == "https", parts.host == "open.spotify.com", parts.user == nil, parts.password == nil, parts.port == nil || parts.port == 443 else { throw DhunError.message("Paste a full public Spotify playlist link.") }
        let regex = try! NSRegularExpression(pattern: #"^/(?:intl-[A-Za-z-]+/)?playlist/([A-Za-z0-9]{22})/?$"#), string = parts.path as NSString
        guard let match = regex.firstMatch(in: parts.path, range: NSRange(location: 0, length: string.length)) else { throw DhunError.message("Use Spotify's Share → Copy playlist link.") }; return string.substring(with: match.range(at: 1))
    }
    public static func tracks(_ html: String) throws -> [Track] {
        let regex = try! NSRegularExpression(pattern: #"<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>(.*?)</script>"#, options: [.dotMatchesLineSeparators]), string = html as NSString
        guard let match = regex.firstMatch(in: html, range: NSRange(location: 0, length: string.length)), let data = string.substring(with: match.range(at: 1)).data(using: .utf8), let root = try JSONSerialization.jsonObject(with: data) as? [String: Any], let props = root["props"] as? [String: Any], let page = props["pageProps"] as? [String: Any], let state = page["state"] as? [String: Any], let stateData = state["data"] as? [String: Any], let entity = stateData["entity"] as? [String: Any], entity["type"] as? String == "playlist", let rows = entity["trackList"] as? [[String: Any]] else { throw DhunError.message("Spotify's public preview is unavailable. Private playlists aren't supported.") }
        return rows.compactMap { row in guard let uri = row["uri"] as? String, uri.hasPrefix("spotify:track:"), let title = row["title"] as? String, let artist = row["subtitle"] as? String, !title.isEmpty, !artist.isEmpty else { return nil }; return Track(id: uri, title: String(title.prefix(300)), artist: String(artist.prefix(200)), duration: (row["duration"] as? Double ?? 0) / 1000) }
    }
    public static func match(_ target: Track, candidates: [Track]) -> Track? {
        candidates.first { candidate in
            let artist = target.artist.lowercased().replacingOccurrences(of: "\u{00a0}", with: " ").split(separator: ",").first.map(String.init) ?? ""
            return candidate.family == target.family && !artist.isEmpty && candidate.artist.lowercased().contains(artist.trimmingCharacters(in: .whitespaces)) && (target.duration == 0 || candidate.duration == 0 || abs(target.duration - candidate.duration) <= 20)
        }
    }
}
