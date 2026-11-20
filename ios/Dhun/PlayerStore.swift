import SwiftUI
import AVFoundation
import MediaPlayer
import DhunCore

@MainActor final class PlayerStore: ObservableObject {
    @Published var library = Library()
    @Published var queue: [Track] = []
    @Published var index = 0
    @Published var playing = false
    @Published var buffering = false
    @Published var elapsed = 0.0
    @Published var duration = 0.0
    @Published var message: String?
    @Published var results: [Track] = []
    @Published var home: [Track] = []
    @Published var searching = false
    @Published var loadingHome = false
    @Published var query = ""
    @Published var lyrics = ""
    @Published var lyricLines: [LyricLine] = []
    let catalogue = Catalogue()
    private let player = AVPlayer()
    private var observer: Any?
    private var ending: NSObjectProtocol?
    private var interruption: NSObjectProtocol?
    private var routeChange: NSObjectProtocol?
    private var resolution: Task<Void, Never>?
    private var searchTask: Task<Void, Never>?
    private var lyricsID = ""
    private var downloading = Set<String>()
    private let testing = ProcessInfo.processInfo.arguments.contains("--ui-testing")
    static let folder: URL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    private var libraryFile: URL { Self.folder.appendingPathComponent("library.json") }
    var current: Track? { queue.indices.contains(index) ? queue[index] : nil }
    var tint: Color { library.theme == "indigo" ? Color(red: 0.55, green: 0.53, blue: 1) : library.theme == "forest" ? .mint : .white }
    init() {
        if let data = try? Data(contentsOf: libraryFile), let saved = try? JSONDecoder().decode(Library.self, from: data) { library = saved }
        if testing {
            library = Library()
            home = [Track(id: "demo-local", title: "Your everyday soundtrack", artist: "Dhun", duration: 60, localFile: "demo.wav"), Track(id: "demo-second", title: "Find your rhythm", artist: "Dhun", duration: 180, localFile: "demo.wav"), Track(id: "demo-third", title: "A little more you", artist: "Dhun", duration: 215, localFile: "demo.wav")]
            try? Self.testTone().write(to: Self.folder.appendingPathComponent("demo.wav"))
        }
        observer = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.5, preferredTimescale: 600), queue: .main) { [weak self] time in
            Task { @MainActor in
                guard let self else { return }; self.elapsed = time.seconds.isFinite ? time.seconds : 0
                let seconds = self.player.currentItem?.duration.seconds ?? 0; self.duration = seconds.isFinite ? seconds : (self.current?.duration ?? 0)
                self.playing = self.player.rate > 0; self.buffering = self.player.timeControlStatus == .waitingToPlayAtSpecifiedRate
                if self.player.currentItem?.status == .failed { self.message = self.player.currentItem?.error?.localizedDescription ?? "Playback failed. Try another track." }
            }
        }
        ending = NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: nil, queue: .main) { [weak self] notification in
            Task { @MainActor in guard let self, let item = notification.object as? AVPlayerItem, item === self.player.currentItem else { return }; self.next() }
        }
        interruption = NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] _ in Task { @MainActor in self?.pause() } }
        routeChange = NotificationCenter.default.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { [weak self] note in
            if (note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt) == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue { Task { @MainActor in self?.pause() } }
        }
        let commands = MPRemoteCommandCenter.shared()
        commands.playCommand.addTarget { [weak self] _ in Task { @MainActor in self?.resume() }; return .success }
        commands.pauseCommand.addTarget { [weak self] _ in Task { @MainActor in self?.pause() }; return .success }
        commands.nextTrackCommand.addTarget { [weak self] _ in Task { @MainActor in self?.next() }; return .success }
        commands.previousTrackCommand.addTarget { [weak self] _ in Task { @MainActor in self?.previous() }; return .success }
    }
    func save() { do { try JSONEncoder().encode(library).write(to: libraryFile, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication]) } catch { message = "Couldn't save your library: \(error.localizedDescription)" } }
    func favourite(_ track: Track) { if library.favourites.contains(where: { $0.id == track.id }) { library.favourites.removeAll { $0.id == track.id } } else { library.favourites.append(track) }; save() }
    func createPlaylist(_ name: String) { let name = String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(80)); guard !name.isEmpty else { return }; library.playlists.append(Playlist(name: name)); save() }
    func add(_ track: Track, to playlistID: UUID) { guard let i = library.playlists.firstIndex(where: { $0.id == playlistID }), !library.playlists[i].tracks.contains(where: { $0.id == track.id }) else { return }; library.playlists[i].tracks.append(track); save() }
    func enqueue(_ track: Track, next: Bool) { if queue.isEmpty { play(track); return }; queue.insert(track, at: next ? min(index + 1, queue.count) : queue.count) }
    func play(_ track: Track, in tracks: [Track]? = nil) {
        resolution?.cancel(); lyrics = ""; lyricLines = []; lyricsID = ""; elapsed = 0; buffering = true; playing = false; player.pause()
        if let tracks { queue = tracks; index = tracks.firstIndex(where: { $0.id == track.id }) ?? 0 }
        else if current?.id != track.id { queue = [track]; index = 0 }
        library.recents.removeAll { $0.id == track.id }; library.recents.insert(track, at: 0); library.recents = Array(library.recents.prefix(40)); save()
        resolution = Task {
            do {
                let url: URL
                if let file = (library.downloads.first { $0.id == track.id })?.localFile ?? track.localFile { url = Self.folder.appendingPathComponent(URL(fileURLWithPath: file).lastPathComponent) }
                else { url = try await catalogue.stream(track) }
                try Task.checkCancellation(); guard current?.id == track.id else { return }
                try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default); try AVAudioSession.sharedInstance().setActive(true)
                player.replaceCurrentItem(with: AVPlayerItem(url: url)); resume(); buffering = false
                MPNowPlayingInfoCenter.default().nowPlayingInfo = [MPMediaItemPropertyTitle: track.title, MPMediaItemPropertyArtist: track.artist, MPMediaItemPropertyPlaybackDuration: track.duration]
                if queue.count - index < 3 && track.localFile == nil { await refill(track) }
            } catch is CancellationError {} catch { buffering = false; message = error.localizedDescription }
        }
    }
    func resume() { player.play(); playing = true }
    func pause() { player.pause(); playing = false }
    func toggle() { playing ? pause() : resume() }
    func seek(_ seconds: Double) { guard seconds.isFinite else { return }; player.seek(to: CMTime(seconds: max(0, min(duration, seconds)), preferredTimescale: 600)) }
    func next() { guard queue.indices.contains(index + 1) else { pause(); return }; index += 1; play(queue[index]) }
    func previous() { if elapsed > 3 { seek(0) } else if index > 0 { index -= 1; play(queue[index]) } }
    func search() {
        searchTask?.cancel(); let text = query
        if testing { results = home; return }
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { results = []; searching = false; return }
        searching = true
        searchTask = Task { do { try await Task.sleep(for: .milliseconds(350)); let found = try await catalogue.search(text); try Task.checkCancellation(); results = found; searching = false } catch is CancellationError {} catch { if !Task.isCancelled { message = error.localizedDescription; searching = false } } }
    }
    func loadHome() async {
        guard !testing, !loadingHome else { return }; loadingHome = true; defer { loadingHome = false }
        do { let artist = library.recents.first?.artist ?? ""; let query = [library.language == "Any" ? "" : library.language, artist.isEmpty ? library.mood : artist, "songs"].joined(separator: " "); home = CatalogueParser.station(try await catalogue.search(query), excluding: [], limit: 20) } catch { if home.isEmpty { message = error.localizedDescription } }
    }
    private func refill(_ seed: Track) async {
        do { let more = try await catalogue.search("\(seed.artist) similar songs"); guard current?.id == seed.id else { return }; queue += CatalogueParser.station(more, excluding: queue + library.recents, limit: 15) } catch { /* Playback remains available if discovery is offline. */ }
    }
    func loadLyrics() async {
        guard let track = current, lyricsID != track.id else { return }; lyricsID = track.id; lyrics = "Looking for lyrics…"
        do { let value = try await catalogue.lyrics(track); guard current?.id == track.id else { return }; lyrics = value; lyricLines = LyricLine.parse(value) } catch { if current?.id == track.id { lyrics = error.localizedDescription } }
    }
    func download(_ track: Track) async {
        guard track.localFile == nil, !library.downloads.contains(where: { $0.id == track.id }), downloading.insert(track.id).inserted else { return }
        defer { downloading.remove(track.id) }
        do {
            let url = try await catalogue.stream(track); let (file, response) = try await URLSession.shared.download(from: url)
            defer { try? FileManager.default.removeItem(at: file) }
            guard (response as? HTTPURLResponse)?.statusCode == 200, (try file.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0) <= 128_000_000 else { throw DhunError.message("Download failed or exceeded 128 MB.") }
            let name = "\(UUID().uuidString).m4a"; try FileManager.default.moveItem(at: file, to: Self.folder.appendingPathComponent(name))
            var saved = track; saved.localFile = name; library.downloads.append(saved); save(); message = "Saved for offline listening."
        } catch { message = error.localizedDescription }
    }
    func importFiles(_ urls: [URL]) {
        for url in urls {
            let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
            do { guard (try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0) <= 128_000_000 else { throw DhunError.message("Choose audio files smaller than 128 MB.") }; let name = "\(UUID().uuidString).\(url.pathExtension)"; try FileManager.default.copyItem(at: url, to: Self.folder.appendingPathComponent(name)); library.downloads.append(Track(id: UUID().uuidString, title: url.deletingPathExtension().lastPathComponent, artist: "On this iPhone", localFile: name)); save() } catch { message = error.localizedDescription }
        }
    }
    private static func testTone() -> Data {
        var bytes = Data(); func word<T: FixedWidthInteger>(_ value: T) { var little = value.littleEndian; withUnsafeBytes(of: &little) { bytes.append(contentsOf: $0) } }
        bytes.append(Data("RIFF".utf8)); word(UInt32(36 + 24000 * 60 * 2)); bytes.append(Data("WAVEfmt ".utf8)); word(UInt32(16)); word(UInt16(1)); word(UInt16(1)); word(UInt32(24000)); word(UInt32(48000)); word(UInt16(2)); word(UInt16(16)); bytes.append(Data("data".utf8)); word(UInt32(24000 * 60 * 2)); bytes.append(Data(count: 24000 * 60 * 2)); return bytes
    }
}
