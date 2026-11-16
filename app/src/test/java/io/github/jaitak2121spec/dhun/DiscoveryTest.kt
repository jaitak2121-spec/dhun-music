package io.github.jaitak2121spec.dhun

import io.github.jaitak2121spec.dhun.data.DiscoveryTaste
import io.github.jaitak2121spec.dhun.data.cleanHomeShelves
import io.github.jaitak2121spec.dhun.data.diverseDiscovery
import io.github.jaitak2121spec.dhun.data.model.HomeShelf
import io.github.jaitak2121spec.dhun.data.model.ShelfItem
import io.github.jaitak2121spec.dhun.data.model.Song
import org.junit.Assert.*
import org.junit.Test

class DiscoveryTest {
    @Test fun `personal queries keep cold start discovery and blend bounded learned seeds`() {
        assertEquals(listOf("new music discoveries"), io.github.jaitak2121spec.dhun.data.personalDiscoveryQueries(DiscoveryTaste(), emptyList()))
        val queries = io.github.jaitak2121spec.dhun.data.personalDiscoveryQueries(DiscoveryTaste("Hindi", "Chosen", "acoustic"), listOf("Replayed", "replayed", "New artist", "Overflow"))
        assertEquals(4, queries.size)
        assertTrue(queries.any { it.startsWith("Replayed ") })
        assertTrue(queries.last().contains("new music discoveries"))
        assertTrue(queries.none { it.contains("Overflow") })
    }

    private fun song(id: Int, title: String = "Song $id", artist: String = "Artist $id") = Song(id.toString().padStart(11, '0'), title, artist, null)

    @Test fun `empty tastes make no searches and explicit queries are bounded and unique`() {
        assertFalse(DiscoveryTaste().configured)
        val queries = DiscoveryTaste("Hindi", " A, a, B, C, D ", "acoustic").queries
        assertEquals(listOf("A Hindi acoustic songs", "B Hindi acoustic songs", "C Hindi acoustic songs"), queries)
        assertTrue(DiscoveryTaste("x".repeat(500), "a".repeat(500), "g".repeat(500)).queries.all { it.length <= 156 })
    }
    @Test fun `discovery interleaves seeds and excludes duplicates dislikes and local files`() {
        val a = song(1, "Hello (Official Audio)", "A")
        val b = song(2, "Hello [Official Video]", "A")
        val result = diverseDiscovery(listOf(listOf(a,b,song(3,artist="A"),song(4,artist="A"),song(5,artist="A")),listOf(song(8),song(9),song(10).copy(localUri="file:///private/song"))), setOf(song(9).videoId))
        assertEquals(listOf(a.videoId,song(8).videoId,song(3).videoId,song(4).videoId), result.map { it.videoId })
        assertTrue(result.none { it.videoId == b.videoId || it.localUri != null })
    }
    @Test fun `recent and taste shelves lead without duplicate cards or empty shelves`() {
        val item = ShelfItem("Song", "Artist", null, song(1).videoId, null)
        val shelves = cleanHomeShelves(listOf(HomeShelf("Other",listOf(item)),HomeShelf("Picked for your taste",listOf(item.copy(videoId=song(2).videoId))),HomeShelf("Recents",listOf(item))))
        assertEquals(listOf("Recents","Picked for your taste"), shelves.map { it.title })
    }
}
