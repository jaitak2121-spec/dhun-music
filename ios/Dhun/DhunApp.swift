import SwiftUI
import DhunCore
import UniformTypeIdentifiers

@main @MainActor struct DhunApp: App {
    @StateObject private var store = PlayerStore()
    @StateObject private var account = CloudAccount()
    @Environment(\.scenePhase) private var phase
    var body: some Scene {
        WindowGroup {
            RootView().environmentObject(store).environmentObject(account).tint(store.tint).preferredColorScheme(.dark)
                .task { await account.refresh() }
                .onChange(of: phase) { _, phase in if phase == .active { Task { await account.foreground() } } }
        }
    }
}
struct RootView: View {
    @EnvironmentObject var store: PlayerStore
    @EnvironmentObject var account: CloudAccount
    @State private var profile = false
    @State private var player = false
    var body: some View {
        TabView {
            NavigationStack { HomeView().toolbar { profileButton } }.tabItem { Label("Home", systemImage: "house.fill") }
            NavigationStack { SearchView().toolbar { profileButton } }.tabItem { Label("Search", systemImage: "magnifyingglass") }
            NavigationStack { LibraryView().toolbar { profileButton } }.tabItem { Label("Library", systemImage: "books.vertical.fill") }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if let track = store.current {
                HStack(spacing: 12) {
                    Button { player = true } label: { HStack { Artwork(track: track, size: 44); VStack(alignment: .leading) { Text(track.title).font(.subheadline.bold()).lineLimit(1); Text(track.artist).font(.caption).foregroundStyle(.secondary).lineLimit(1) } }.frame(maxWidth: .infinity, alignment: .leading) }.buttonStyle(.plain).accessibilityIdentifier("openPlayer")
                    if store.buffering { ProgressView() } else { Button { store.toggle() } label: { Image(systemName: store.playing ? "pause.fill" : "play.fill").font(.title3) }.accessibilityLabel(store.playing ? "Pause" : "Play") }
                    Button { store.next() } label: { Image(systemName: "forward.end.fill") }.accessibilityLabel("Next track")
                }.padding(12).background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20)).padding(.horizontal, 12).padding(.bottom, 4)
            }
        }
        .sheet(isPresented: $profile) { ProfileView() }
        .sheet(isPresented: $player) { NowPlayingView() }
        .alert("Dhun", isPresented: Binding(get: { store.message != nil }, set: { if !$0 { store.message = nil } })) { Button("OK") { store.message = nil } } message: { Text(store.message ?? "") }
    }
    private var profileButton: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) { Button { profile = true } label: { Image(systemName: "person.crop.circle").font(.title2) }.accessibilityLabel("Your profile") }
    }
}
struct HomeView: View {
    @EnvironmentObject var store: PlayerStore
    @EnvironmentObject var account: CloudAccount
    @State private var profile = false
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 26) {
                HStack { Image("DhunMark").resizable().frame(width: 44, height: 44).clipShape(RoundedRectangle(cornerRadius: 12)); Text("Dhun").font(.largeTitle.bold()) }
                Text(account.name.isEmpty ? "Find your next favourite" : "Hi, \(account.name.split(separator: " ").first.map(String.init) ?? account.name)").font(.system(size: 38, weight: .bold)).accessibilityIdentifier("homeGreeting")
                Button { profile = true } label: {
                    VStack(alignment: .leading, spacing: 8) { Label(account.connected ? "Your music profile" : "Make Dhun yours", systemImage: "sparkles").font(.headline); Text(account.connected ? "Choose your languages and sounds." : "Sign in and tune your taste. Or just start listening.").font(.subheadline).foregroundStyle(.secondary) }.frame(maxWidth: .infinity, alignment: .leading).padding(20).background(Color.white.opacity(0.09), in: RoundedRectangle(cornerRadius: 22))
                }.buttonStyle(.plain)
                VStack(alignment: .leading, spacing: 6) { Text("Made for your moment").font(.title2.bold()); Text("\(store.library.language == "Any" ? "Your language" : store.library.language) · \(store.library.mood)").foregroundStyle(.secondary) }
                if store.loadingHome { ProgressView("Finding your music…").frame(maxWidth: .infinity) }
                if !store.home.isEmpty { ScrollView(.horizontal, showsIndicators: false) { HStack(alignment: .top, spacing: 16) { ForEach(store.home.prefix(8)) { track in Button { store.play(track, in: store.home) } label: { VStack(alignment: .leading) { Artwork(track: track, size: 168); Text(track.title).font(.headline).lineLimit(2); Text(track.artist).font(.caption).foregroundStyle(.secondary).lineLimit(1) }.frame(width: 168, alignment: .leading) }.buttonStyle(.plain).accessibilityIdentifier("home-\(track.id)") } } } }
                if !store.library.recents.isEmpty { Text("Recently played").font(.title2.bold()); ForEach(store.library.recents.prefix(8)) { TrackRow(track: $0) } }
                Text("Fresh discoveries").font(.title2.bold())
                ForEach(store.home.dropFirst(8)) { TrackRow(track: $0) }
                if store.home.isEmpty && !store.loadingHome { ContentUnavailableView("Your next favourite awaits", systemImage: "music.note", description: Text("Search for a song, or refresh your discoveries.")) }
                Button("Refresh discoveries") { Task { await store.loadHome() } }.buttonStyle(.bordered)
            }.padding(20).padding(.bottom, 15)
        }.background(Color.black).navigationBarTitleDisplayMode(.inline).task { if store.home.isEmpty { await store.loadHome() } }.refreshable { await store.loadHome() }.sheet(isPresented: $profile) { ProfileView() }
    }
}
struct SearchView: View {
    @EnvironmentObject var store: PlayerStore
    var body: some View {
        List {
            if store.searching { ProgressView("Searching…") }
            if store.results.isEmpty && !store.searching { ContentUnavailableView("Find your rhythm", systemImage: "magnifyingglass", description: Text("Search songs and artists.")) }
            ForEach(store.results) { TrackRow(track: $0).listRowBackground(Color.black) }
        }.listStyle(.plain).scrollContentBackground(.hidden).background(Color.black).navigationTitle("Search")
            .searchable(text: $store.query, prompt: "Songs, artists, a feeling…").onChange(of: store.query) { _, _ in store.search() }
    }
}
struct LibraryView: View {
    @EnvironmentObject var store: PlayerStore
    @State private var newPlaylist = false
    @State private var name = ""
    @State private var importing = false
    @State private var files = false
    var body: some View {
        List {
            Section {
                Button { newPlaylist = true } label: { Label("New playlist", systemImage: "plus.circle.fill").font(.headline) }.accessibilityIdentifier("newPlaylist")
                Button { importing = true } label: { Label("Import a playlist", systemImage: "square.and.arrow.down").font(.headline) }
                Button { files = true } label: { Label("Add audio from Files", systemImage: "folder") }
            }
            Section("Your collection") {
                NavigationLink { TrackList(title: "Liked songs", tracks: store.library.favourites) } label: { Label("Liked songs · \(store.library.favourites.count)", systemImage: "heart.fill") }
                NavigationLink { TrackList(title: "On this iPhone", tracks: store.library.downloads) } label: { Label("Downloads & local music", systemImage: "arrow.down.circle.fill") }
            }
            Section("Playlists") { ForEach(store.library.playlists) { playlist in NavigationLink { PlaylistView(id: playlist.id) } label: { Label(playlist.name, systemImage: "music.note.list") } }.onDelete { store.library.playlists.remove(atOffsets: $0); store.save() } }
        }.scrollContentBackground(.hidden).background(Color.black).navigationTitle("Library")
        .alert("New playlist", isPresented: $newPlaylist) { TextField("Playlist name", text: $name); Button("Create") { store.createPlaylist(name); name = "" }; Button("Cancel", role: .cancel) {} }
        .sheet(isPresented: $importing) { ImportPlaylistView() }
        .fileImporter(isPresented: $files, allowedContentTypes: [.audio], allowsMultipleSelection: true) { result in switch result { case .success(let urls): store.importFiles(urls); case .failure(let error): store.message = error.localizedDescription } }
    }
}
struct TrackList: View {
    let title: String
    let tracks: [Track]
    var body: some View { List { if tracks.isEmpty { ContentUnavailableView("Nothing here yet", systemImage: "music.note", description: Text("Add songs from search or a song menu.")) }; ForEach(tracks) { TrackRow(track: $0).listRowBackground(Color.black) } }.listStyle(.plain).scrollContentBackground(.hidden).background(Color.black).navigationTitle(title) }
}
struct PlaylistView: View {
    @EnvironmentObject var store: PlayerStore
    let id: UUID
    private var playlist: Playlist? { store.library.playlists.first { $0.id == id } }
    var body: some View {
        List {
            if let playlist {
                if !playlist.tracks.isEmpty { Button("Play playlist", systemImage: "play.fill") { store.play(playlist.tracks[0], in: playlist.tracks) } }
                if playlist.tracks.isEmpty { ContentUnavailableView("Make it yours", systemImage: "music.note.list", description: Text("Find a song in Search, open its menu and choose Add to playlist.")) }
                ForEach(playlist.tracks) { TrackRow(track: $0).listRowBackground(Color.black) }.onDelete { offsets in guard let i = store.library.playlists.firstIndex(where: { $0.id == id }) else { return }; store.library.playlists[i].tracks.remove(atOffsets: offsets); store.save() }
            }
        }.listStyle(.plain).scrollContentBackground(.hidden).background(Color.black).navigationTitle(playlist?.name ?? "Playlist")
    }
}
struct Artwork: View {
    let track: Track
    let size: CGFloat
    var body: some View {
        AsyncImage(url: track.artwork) { image in image.resizable().scaledToFill() } placeholder: { ZStack { LinearGradient(colors: [.white.opacity(0.14), .white.opacity(0.03)], startPoint: .topLeading, endPoint: .bottomTrailing); Image(systemName: "waveform").font(.system(size: size * 0.3)).foregroundStyle(.white.opacity(0.7)) } }.frame(width: size, height: size).clipped().clipShape(RoundedRectangle(cornerRadius: size * 0.1))
    }
}
struct TrackRow: View {
    @EnvironmentObject var store: PlayerStore
    let track: Track
    @State private var addToPlaylist = false
    var body: some View {
        HStack(spacing: 12) {
            Button { store.play(track) } label: { HStack(spacing: 12) { Artwork(track: track, size: 52); VStack(alignment: .leading, spacing: 4) { Text(track.title).font(.subheadline.bold()).lineLimit(2); Text(track.artist).font(.caption).foregroundStyle(.secondary).lineLimit(1) } }.frame(maxWidth: .infinity, alignment: .leading) }.buttonStyle(.plain).accessibilityLabel("Play \(track.title)")
            Menu {
                Button(store.library.favourites.contains(where: { $0.id == track.id }) ? "Unlike song" : "Like song", systemImage: "heart") { store.favourite(track) }
                Button("Play next", systemImage: "text.line.first.and.arrowtriangle.forward") { store.enqueue(track, next: true) }
                Button("Add to queue", systemImage: "text.badge.plus") { store.enqueue(track, next: false) }
                Button("Add to playlist", systemImage: "music.note.list") { addToPlaylist = true }
                if track.localFile == nil { Button("Download", systemImage: "arrow.down.circle") { Task { await store.download(track) } } }
            } label: { Image(systemName: "ellipsis").frame(width: 44, height: 44) }.accessibilityLabel("Options for \(track.title)")
        }.padding(.vertical, 4)
        .swipeActions(edge: .leading, allowsFullSwipe: true) { Button("Play next", systemImage: "play.fill") { store.enqueue(track, next: true) }.tint(.indigo) }
        .swipeActions(edge: .trailing, allowsFullSwipe: true) { Button("Queue", systemImage: "text.badge.plus") { store.enqueue(track, next: false) }.tint(.gray) }
        .sheet(isPresented: $addToPlaylist) { AddToPlaylistView(track: track) }
    }
}
struct AddToPlaylistView: View {
    @EnvironmentObject var store: PlayerStore
    @Environment(\.dismiss) var dismiss
    let track: Track
    @State private var name = ""
    var body: some View { NavigationStack { List { Section("Create and add") { TextField("Playlist name", text: $name); Button("Create playlist") { store.createPlaylist(name); if let id = store.library.playlists.last?.id, !name.trimmingCharacters(in: .whitespaces).isEmpty { store.add(track, to: id); dismiss() } }.disabled(name.trimmingCharacters(in: .whitespaces).isEmpty) }; ForEach(store.library.playlists) { playlist in Button(playlist.name) { store.add(track, to: playlist.id); dismiss() } } }.navigationTitle("Add to playlist").toolbar { Button("Close") { dismiss() } } } }
}
struct NowPlayingView: View {
    @EnvironmentObject var store: PlayerStore
    @Environment(\.dismiss) var dismiss
    @State private var queue = false
    @State private var lyrics = false
    var body: some View {
        NavigationStack { ScrollView { if let track = store.current { VStack(spacing: 25) {
            Artwork(track: track, size: 280).padding(.top, 24)
            VStack(spacing: 8) { Text(track.title).font(.title2.bold()).multilineTextAlignment(.center); Text(track.artist).foregroundStyle(.secondary) }
            VStack { Slider(value: Binding(get: { min(max(0, store.elapsed), max(1, store.duration)) }, set: { store.seek($0) }), in: 0...max(1, store.duration)).accessibilityLabel("Playback position"); HStack { Text(clock(store.elapsed)); Spacer(); Text(clock(store.duration)) }.font(.caption.monospacedDigit()).foregroundStyle(.secondary) }
            HStack(spacing: 42) { Button { store.previous() } label: { Image(systemName: "backward.end.fill").font(.title) }.accessibilityLabel("Previous track"); Button { store.toggle() } label: { Image(systemName: store.playing ? "pause.circle.fill" : "play.circle.fill").font(.system(size: 70)) }.accessibilityLabel(store.playing ? "Pause" : "Play"); Button { store.next() } label: { Image(systemName: "forward.end.fill").font(.title) }.accessibilityLabel("Next track") }
            if store.buffering { ProgressView("Loading audio…") }
            HStack(spacing: 32) { Button { store.favourite(track) } label: { Image(systemName: store.library.favourites.contains(where: { $0.id == track.id }) ? "heart.fill" : "heart").font(.title2) }.accessibilityLabel("Like song"); Button("Lyrics", systemImage: "quote.bubble") { lyrics = true }; Button("Queue", systemImage: "list.bullet") { queue = true } }
        }.padding(24) } }.background(Color.black).navigationTitle("Now playing").navigationBarTitleDisplayMode(.inline).toolbar { ToolbarItem(placement: .topBarLeading) { Button("Close") { dismiss() } } }
        .sheet(isPresented: $queue) { NavigationStack { List { ForEach(Array(store.queue.enumerated()), id: \.offset) { offset, track in Button { store.index = offset; store.play(track) } label: { Label(track.title, systemImage: offset == store.index ? "waveform" : "music.note") } } }.navigationTitle("Queue").toolbar { Button("Done") { queue = false } } } }
        .sheet(isPresented: $lyrics) { NavigationStack { ScrollView { VStack(alignment: .leading, spacing: 20) { if store.lyricLines.isEmpty { Text(store.lyrics).font(.title3) } else { ForEach(store.lyricLines) { line in Button { store.seek(line.time) } label: { Text(line.text).font(.title2.bold()).foregroundStyle(store.elapsed >= line.time && store.elapsed < (store.lyricLines.first(where: { $0.time > line.time })?.time ?? .infinity) ? .white : .gray) }.buttonStyle(.plain) } }; Text("Lyrics provided by LRCLIB. Availability varies.").font(.caption).foregroundStyle(.secondary) }.padding(24) }.navigationTitle("Lyrics").toolbar { Button("Done") { lyrics = false } }.task { await store.loadLyrics() } } }
    }
    private func clock(_ time: Double) -> String { let value = time.isFinite ? max(0, Int(time)) : 0; return String(format: "%d:%02d", value / 60, value % 60) }
}
struct ProfileView: View {
    @EnvironmentObject var store: PlayerStore
    @EnvironmentObject var account: CloudAccount
    @Environment(\.dismiss) var dismiss
    var body: some View {
        NavigationStack { Form {
            Section {
                if account.connected { Text("Hi, \(account.name.split(separator: " ").first.map(String.init) ?? "music lover")").font(.title2.bold()); Text(account.email).font(.subheadline).foregroundStyle(.secondary) }
                else { Text("Make Dhun yours").font(.title2.bold()); Text("Your profile. Your kind of music."); Text("Dhun stores your Google name, email and available profile photo for your account.").font(.caption).foregroundStyle(.secondary); Button(account.busy ? "Signing in…" : "Continue with Google") { Task { await account.signIn() } }.disabled(account.busy) }
                if let message = account.message { Text(message).font(.caption).foregroundStyle(.secondary) }
            }
            Section("Your music taste") {
                Picker("Language", selection: $store.library.language) { ForEach(["Any", "Hindi", "English", "Punjabi", "Urdu", "Tamil", "Telugu", "Bengali", "Marathi", "Malayalam"], id: \.self) { Text($0) } }
                Picker("Mood", selection: $store.library.mood) { ForEach(["Chill", "Focus", "Energy", "Romance", "Acoustic", "Hip hop", "Pop", "Indie"], id: \.self) { Text($0) } }
                Button("Save and refresh") { store.save(); Task { await store.loadHome() }; dismiss() }
            }
            Section("Appearance") { Picker("Theme", selection: $store.library.theme) { Text("Black & white").tag("monochrome"); Text("Indigo").tag("indigo"); Text("Forest").tag("forest") }.onChange(of: store.library.theme) { _, _ in store.save() } }
            if account.connected { Section("Account activity · optional") { Text("Share active dates, app version and platform with your account to help improve Dhun. No songs or listening history. Kept for 90 days; turning off deletes activity.").font(.caption); Toggle("Share account activity", isOn: Binding(get: { account.activityEnabled }, set: { enabled in Task { await account.setActivity(enabled) } })); Button("Sign out") { Task { await account.signOut() } } } }
            Section { Link("Privacy & manage account", destination: URL(string: "https://dhun-cloud.vercel.app/#privacy")!); NavigationLink("Credits & source") { ScrollView { Text((try? String(contentsOf: Bundle.main.url(forResource: "Credits", withExtension: "txt") ?? URL(fileURLWithPath: "/nonexistent"))) ?? "Dhun · GPL-3.0. YouTubeKit · MIT. Lyrics: LRCLIB.").font(.caption).padding() }.navigationTitle("Credits") }; Text("Listening history and playlists stay on this iPhone. Catalogue searches go to YouTube; lyrics requests go to LRCLIB.").font(.caption).foregroundStyle(.secondary) }
        }.navigationTitle("Your profile").toolbar { Button("Done") { dismiss() } }.task { await account.refresh() } }
    }
}
struct ImportPlaylistView: View {
    @EnvironmentObject var store: PlayerStore
    @Environment(\.dismiss) var dismiss
    @State private var link = ""
    @State private var source = "youtube"
    @State private var name = "Imported playlist"
    @State private var tracks: [Track] = []
    @State private var busy = false
    @State private var message = ""
    var body: some View { NavigationStack { List {
        Section { Picker("Source", selection: $source) { Text("YouTube / YouTube Music").tag("youtube"); Text("Spotify").tag("spotify") }; TextField("Playlist name", text: $name); TextField("Public playlist link", text: $link).textInputAutocapitalization(.never).autocorrectionDisabled().keyboardType(.URL); Text(source == "youtube" ? "Imports the first public page, up to 100 tracks. No YouTube sign-in. Large playlists may be incomplete." : "Matches up to 20 songs from Spotify’s public preview. This may take several minutes. Missing or uncertain matches are skipped. Review the songs before saving.").font(.caption).foregroundStyle(.secondary); Button(busy ? "Loading…" : "Preview playlist") { busy = true; tracks = []; Task { do { if source == "youtube" { tracks = try await store.catalogue.playlist(link) } else { tracks = try await store.catalogue.spotifyPlaylist(link) }; message = "\(tracks.count) available tracks. Swipe to remove unwanted songs before saving." } catch { message = error.localizedDescription }; busy = false } }.disabled(busy); if !message.isEmpty { Text(message).font(.caption) } }
        ForEach(tracks) { track in VStack(alignment: .leading) { Text(track.title); Text(track.artist).font(.caption).foregroundStyle(.secondary) } }.onDelete { tracks.remove(atOffsets: $0) }
    }.navigationTitle("Import playlist").toolbar { ToolbarItem(placement: .topBarLeading) { Button("Cancel") { dismiss() } }; ToolbarItem(placement: .topBarTrailing) { Button("Save") { store.library.playlists.append(Playlist(name: String(name.prefix(80)), tracks: tracks)); store.save(); dismiss() }.disabled(tracks.isEmpty || busy) } } } }
}
