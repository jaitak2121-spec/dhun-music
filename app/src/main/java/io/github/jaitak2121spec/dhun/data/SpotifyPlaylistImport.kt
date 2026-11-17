package io.github.jaitak2121spec.dhun.data

import io.github.jaitak2121spec.dhun.data.model.SearchFilter
import io.github.jaitak2121spec.dhun.data.model.SearchResult
import io.github.jaitak2121spec.dhun.data.model.Song
import io.github.jaitak2121spec.dhun.data.sources.TrackMatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.*
import okhttp3.Request
import java.io.ByteArrayOutputStream
import java.net.URI
import java.util.concurrent.TimeUnit

data class SpotifyImportTrack(val id: String, val title: String, val artist: String, val seconds: Int?)
data class SpotifyPlaylistPreview(val title: String, val tracks: List<SpotifyImportTrack>)
data class SpotifyImportMatch(val track: SpotifyImportTrack, val song: Song?)

fun spotifyPlaylistId(value: String): String {
    val uri = runCatching { URI(value.trim()) }.getOrNull()
    require(uri != null && uri.scheme == "https" && uri.host == "open.spotify.com" && uri.rawUserInfo == null && uri.port in listOf(-1, 443)) {
        "Paste a full https://open.spotify.com/playlist/ link."
    }
    return Regex("^/(?:intl-[A-Za-z-]+/)?playlist/([A-Za-z0-9]{22})/?$").matchEntire(uri.rawPath)?.groupValues?.get(1)
        ?: error("This link is not a Spotify playlist. Use Share → Copy link in Spotify.")
}

/** ponytail: public embed previews can be incomplete; approved Spotify OAuth is needed for full/private lists. */
fun parseSpotifyPlaylistPreview(html: String): SpotifyPlaylistPreview {
    val script = Regex("""<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>(.*?)</script>""", RegexOption.DOT_MATCHES_ALL)
        .find(html)?.groupValues?.get(1) ?: error("Spotify did not provide a public playlist preview. Check that the playlist is public.")
    val entity = Json.parseToJsonElement(script).jsonObject["props"]?.jsonObject?.get("pageProps")?.jsonObject
        ?.get("state")?.jsonObject?.get("data")?.jsonObject?.get("entity")?.jsonObject
        ?: error("Spotify's preview is unavailable. Please try another public playlist.")
    require(entity["type"]?.jsonPrimitive?.contentOrNull == "playlist") { "This is not a playlist preview." }
    val tracks = entity["trackList"]?.jsonArray.orEmpty().mapNotNull { item ->
        val track = item as? JsonObject ?: return@mapNotNull null
        val id = track["uri"]?.jsonPrimitive?.contentOrNull?.removePrefix("spotify:track:") ?: return@mapNotNull null
        if (!Regex("^[A-Za-z0-9]{22}$").matches(id)) return@mapNotNull null
        val title = track["title"]?.jsonPrimitive?.contentOrNull?.trim()?.take(300).orEmpty()
        val artist = track["subtitle"]?.jsonPrimitive?.contentOrNull?.replace('\u00a0', ' ')?.trim()?.take(200).orEmpty()
        if (title.isEmpty() || artist.isEmpty()) return@mapNotNull null
        SpotifyImportTrack(id, title, artist, track["duration"]?.jsonPrimitive?.longOrNull?.takeIf { it in 1L..86_400_000L }?.div(1000)?.toInt())
    }.distinctBy { it.id }.take(100)
    require(tracks.isNotEmpty()) { "No songs were available in this public preview. Private playlists are not supported." }
    return SpotifyPlaylistPreview(entity["title"]?.jsonPrimitive?.contentOrNull?.trim()?.take(80)?.takeIf { it.isNotEmpty() } ?: "Spotify playlist", tracks)
}

suspend fun loadSpotifyPlaylistPreview(link: String): SpotifyPlaylistPreview = withContext(Dispatchers.IO) {
    val id = spotifyPlaylistId(link)
    val client = Http.client.newBuilder().followRedirects(false).followSslRedirects(false).callTimeout(15, TimeUnit.SECONDS).build()
    val request = Request.Builder().url("https://open.spotify.com/embed/playlist/$id").build()
    client.newCall(request).execute().use { response ->
        check(response.isSuccessful) { "Spotify's public preview is unavailable. Check the link and try again." }
        val output = ByteArrayOutputStream()
        response.body.byteStream().use { input ->
            val buffer = ByteArray(8192)
            while (true) {
                val size = input.read(buffer)
                if (size < 0) break
                check(output.size() + size <= 4 * 1024 * 1024) { "This playlist preview is too large. Try a smaller playlist." }
                output.write(buffer, 0, size)
            }
        }
        parseSpotifyPlaylistPreview(output.toString("UTF-8"))
    }
}

suspend fun matchSpotifyPlaylist(preview: SpotifyPlaylistPreview, onProgress: (Int, Int) -> Unit): List<SpotifyImportMatch> = coroutineScope {
    val matches = mutableListOf<SpotifyImportMatch>()
    // Two catalogue searches at a time leave room for actual music playback.
    for (batch in preview.tracks.chunked(2)) {
        matches += batch.map { track -> async {
            val target = TrackMatcher.Target(track.title, track.artist, track.seconds)
            val candidates = withTimeoutOrNull(8_000L) {
                YtMusicRepository.search((TrackMatcher.queries(target).firstOrNull() ?: return@async SpotifyImportMatch(track, null)).take(160), SearchFilter.SONGS)
                    .getOrNull().orEmpty().filterIsInstance<SearchResult.Track>().map { it.song }
            }.orEmpty()
            SpotifyImportMatch(track, TrackMatcher.best(candidates, target))
        } }.awaitAll()
        onProgress(matches.size, preview.tracks.size)
    }
    matches
}
