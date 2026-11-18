package io.github.jaitak2121spec.dhun

import io.github.jaitak2121spec.dhun.data.readYouTubePlaylistPreview
import io.github.jaitak2121spec.dhun.data.youtubePlaylistId
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.*
import org.junit.Assert.*
import org.junit.Test

class YouTubePlaylistImportTest {
    private val playlist = "PLabcdefghijk0123456789"
    private fun row(index: Int): JsonObject = Json.parseToJsonElement("""{"musicResponsiveListItemRenderer":{
        "playlistItemData":{"videoId":"${index.toString().padStart(11, '0')}"},
        "flexColumns":[
            {"musicResponsiveListItemFlexColumnRenderer":{"text":{"runs":[{"text":"Song $index"}]}}},
            {"musicResponsiveListItemFlexColumnRenderer":{"text":{"runs":[{"text":"Artist $index"}]}}}
        ]
    }}""").jsonObject
    private fun page(ids: List<Int>, token: String? = null, suggestions: Boolean = false): JsonObject = buildJsonObject {
        putJsonObject("header") { putJsonObject("musicResponsiveHeaderRenderer") { putJsonObject("title") {
            putJsonArray("runs") { add(buildJsonObject { put("text", "My public mix") }) }
        } } }
        putJsonObject("continuationContents") {
            putJsonObject("musicPlaylistShelfContinuation") {
                putJsonArray("contents") { ids.forEach { add(row(it)) } }
                if (token != null) putJsonArray("continuations") { add(buildJsonObject { putJsonObject("nextContinuationData") { put("continuation", token) } }) }
            }
            if (suggestions) putJsonObject("musicShelfRenderer") {
                putJsonObject("title") { putJsonArray("runs") { add(buildJsonObject { put("text", "Suggestions") }) } }
                putJsonArray("contents") { add(row(99)) }
            }
        }
    }
    @Test fun `shared playlist links extract only the list from allowed YouTube hosts`() {
        for (link in listOf("https://music.youtube.com/playlist?list=$playlist&si=share", "https://www.youtube.com/playlist?list=$playlist", "https://m.youtube.com/watch?v=abcdefghijk&list=$playlist", "https://youtu.be/abcdefghijk?list=$playlist")) assertEquals(playlist, youtubePlaylistId(link))
        for (link in listOf("http://youtube.com/playlist?list=$playlist", "https://youtube.com.evil.test/playlist?list=$playlist", "https://user:secret@youtube.com/playlist?list=$playlist", "https://youtube.com:123/playlist?list=$playlist", "file:///private/music", "https://youtube.com/watch?v=abcdefghijk", "https://youtube.com/playlist?list=WL", "https://youtube.com/playlist?list=$playlist&list=otherplaylist", "https://youtube.com/playlist?list=../../private")) assertTrue(link, runCatching { youtubePlaylistId(link) }.isFailure)
    }
    @Test fun `pagination preserves playlist order removes duplicates and never imports suggestions`() = runTest {
        val progress = mutableListOf<Int>()
        val result = readYouTubePlaylistPreview(page(listOf(1, 2), "more", true), { progress += it }) { token ->
            assertEquals("more", token); page(listOf(2, 3), suggestions = true)
        }
        assertEquals("My public mix", result.title)
        assertEquals(listOf("Song 1", "Song 2", "Song 3"), result.songs.map { it.title })
        assertEquals(listOf(2, 3), progress)
        assertTrue(result.complete)
    }
    @Test fun `failed pages and looping continuations are clearly partial`() = runTest {
        val failed = readYouTubePlaylistPreview(page(listOf(1), "more")) { error("offline") }
        assertFalse(failed.complete); assertEquals(1, failed.songs.size)
        var requests = 0
        val loop = readYouTubePlaylistPreview(page(listOf(1), "loop")) { requests++; page(listOf(2), "loop") }
        assertFalse(loop.complete); assertEquals(1, requests); assertEquals(2, loop.songs.size)
        val capped = readYouTubePlaylistPreview(page((1..1001).toList())) { error("must not fetch more") }
        assertFalse(capped.complete); assertEquals(1000, capped.songs.size)
    }
    @Test fun `private or empty playlists fail without offering sign in and cancellation propagates`() = runTest {
        assertTrue(runCatching { readYouTubePlaylistPreview(buildJsonObject {}) { error("must not fetch") } }.exceptionOrNull()?.message.orEmpty().contains("private"))
        try {
            readYouTubePlaylistPreview(page(listOf(1), "more")) { throw CancellationException("cancelled") }
            fail("Cancellation must stop importing")
        } catch (_: CancellationException) { }
    }
}
