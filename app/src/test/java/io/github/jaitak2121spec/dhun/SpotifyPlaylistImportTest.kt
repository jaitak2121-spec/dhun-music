package io.github.jaitak2121spec.dhun

import io.github.jaitak2121spec.dhun.data.parseSpotifyPlaylistPreview
import io.github.jaitak2121spec.dhun.data.spotifyPlaylistId
import kotlinx.serialization.json.*
import org.junit.Assert.*
import org.junit.Test

class SpotifyPlaylistImportTest {
    @Test fun `playlist links accept shared public links but never arbitrary hosts credentials or resources`() {
        val id = "a".repeat(22)
        assertEquals(id, spotifyPlaylistId("https://open.spotify.com/playlist/$id?si=shared"))
        assertEquals(id, spotifyPlaylistId("https://open.spotify.com/intl-en/playlist/$id"))
        for (link in listOf("http://open.spotify.com/playlist/$id", "https://open.spotify.com.evil.test/playlist/$id", "https://user:secret@open.spotify.com/playlist/$id", "https://open.spotify.com:444/playlist/$id", "https://open.spotify.com/track/$id", "file:///private/music", "https://open.spotify.com/playlist/short")) {
            assertTrue(link, runCatching { spotifyPlaylistId(link) }.isFailure)
        }
    }
    @Test fun `public preview keeps song order deduplicates and excludes episodes with a bounded preview`() {
        fun track(index: Int) = buildJsonObject {
            put("uri", "spotify:track:" + index.toString().padStart(22, '0'))
            put("title", "Song $index"); put("subtitle", "Artist"); put("duration", 180000)
        }
        val entity = buildJsonObject {
            put("type", "playlist"); put("title", "Imported mix")
            putJsonArray("trackList") {
                add(track(1)); add(track(1)); add(buildJsonObject { put("uri", "spotify:episode:" + "a".repeat(22)); put("title", "Podcast"); put("subtitle", "Host") })
                (2..110).forEach { add(track(it)) }
            }
        }
        var state: JsonElement = entity
        for (key in listOf("entity", "data", "state", "pageProps", "props")) state = buildJsonObject { put(key, state) }
        val parsed = parseSpotifyPlaylistPreview("<html><script id=\"__NEXT_DATA__\" type=\"application/json\">$state</script></html>")
        assertEquals("Imported mix", parsed.title)
        assertEquals(100, parsed.tracks.size)
        assertEquals(listOf("Song 1", "Song 2"), parsed.tracks.take(2).map { it.title })
        assertEquals(180, parsed.tracks.first().seconds)
        assertTrue(runCatching { parseSpotifyPlaylistPreview("private or unavailable") }.isFailure)
    }
}
