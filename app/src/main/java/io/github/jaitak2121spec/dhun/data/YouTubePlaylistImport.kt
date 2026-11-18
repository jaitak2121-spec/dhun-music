package io.github.jaitak2121spec.dhun.data

import io.github.jaitak2121spec.dhun.data.innertube.Innertube
import io.github.jaitak2121spec.dhun.data.innertube.InnertubeParser
import io.github.jaitak2121spec.dhun.data.model.Song
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.JsonObject
import java.net.URI
import java.net.URLDecoder
import java.util.Locale

/** The importer fetches fixed YouTube endpoints, never an arbitrary pasted URL. */
fun youtubePlaylistId(value: String): String {
    val uri = runCatching { URI(value.trim()) }.getOrNull()
    val host = uri?.host?.lowercase(Locale.ROOT)
    require(uri != null && uri.scheme.equals("https", true) && uri.rawUserInfo == null && uri.port in listOf(-1, 443) &&
        host in listOf("youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be")) {
        "Paste a YouTube or YouTube Music playlist link."
    }
    require(uri.rawPath in listOf("/playlist", "/playlist/", "/watch") || host == "youtu.be") { "This link doesn't point to a playlist." }
    val ids = uri.rawQuery.orEmpty().split('&').mapNotNull { part ->
        val pair = part.split('=', limit = 2)
        if (pair.first() == "list" && pair.size == 2) URLDecoder.decode(pair[1], "UTF-8") else null
    }
    require(ids.size == 1 && Regex("^[A-Za-z0-9_-]{10,100}$").matches(ids.single())) {
        "Use the playlist's Share → Copy link option. Private library links aren't supported."
    }
    return ids.single()
}

data class YouTubePlaylistPreview(val title: String, val songs: List<Song>, val complete: Boolean)

suspend fun loadYouTubePlaylistPreview(link: String, onProgress: (Int) -> Unit): YouTubePlaylistPreview {
    val id = youtubePlaylistId(link)
    val first = withTimeoutOrNull(15_000L) { Innertube.browsePublicPlaylist(id) }
        ?: error("YouTube took too long to respond. Try again.")
    return readYouTubePlaylistPreview(first, onProgress) { token ->
        withTimeoutOrNull(10_000L) { Innertube.browsePublicPlaylistContinuation(token) }
            ?: error("The next page didn't load.")
    }
}

/** Only playlist rows are imported: suggestions and radio recommendations never join them. */
internal suspend fun readYouTubePlaylistPreview(
    first: JsonObject, onProgress: (Int) -> Unit = {}, nextPage: suspend (String) -> JsonObject,
): YouTubePlaylistPreview {
    val title = InnertubeParser.parseBrowseHeader(first)?.title?.trim()?.take(80)?.takeIf { it.isNotEmpty() } ?: "Imported YouTube playlist"
    val songs = linkedMapOf<String, Song>()
    val seenTokens = mutableSetOf<String>()
    var response = first
    var pages = 0
    var complete = true
    while (true) {
        val page = InnertubeParser.parsePlaylistShelf(response)
        if (page == null) { complete = false; break }
        val available = page.songs.filter { Regex("^[A-Za-z0-9_-]{11}$").matches(it.videoId) }
        for (song in available) if (song.videoId in songs || songs.size < 1000) songs.putIfAbsent(song.videoId, song)
        onProgress(songs.size)
        val token = page.continuation
        // ponytail: cap an import at 1,000 songs / 10 pages; show partial status before saving.
        if (available.any { it.videoId !in songs } || (token != null && (songs.size >= 1000 || ++pages >= 10 || !seenTokens.add(token)))) {
            complete = false; break
        }
        if (token == null) break
        response = try { nextPage(token) }
        catch (error: CancellationException) { throw error }
        catch (error: Exception) { complete = false; break }
    }
    check(songs.isNotEmpty()) { "No accessible songs were found. The playlist may be private, empty, removed or unavailable in YouTube Music. No sign-in is needed for public playlists." }
    return YouTubePlaylistPreview(title, songs.values.toList(), complete)
}
