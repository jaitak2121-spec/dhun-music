package io.github.jaitak2121spec.dhun

import io.github.jaitak2121spec.dhun.data.model.Song
import io.github.jaitak2121spec.dhun.playback.QueueBuilder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class QueueBuilderTest {

    private fun song(id: String, title: String, artist: String = "Arijit Singh") =
        Song(videoId = id, title = title, artist = artist, thumbnailUrl = null)

    private fun video(id: String, title: String, artist: String = "Arijit Singh") =
        song(id, title, artist).copy(isVideo = true)

    @Test
    fun `the music video cut of a mix is left out`() {
        val extra = QueueBuilder.extend(
            existing = emptyList(),
            candidates = listOf(
                song("aaa", "Dildaara (Stand By Me)", "Vishal-Shekhar"),
                video("bbb", "Lyrical Video: Dildara Song", "Shafqat Amanat Ali"),
                song("ccc", "Sajni"),
            ),
            limit = 10,
        )
        assertEquals(listOf("aaa", "ccc"), extra.map { it.videoId })
    }

    @Test
    fun `a mix of nothing but videos still plays`() {
        val extra = QueueBuilder.extend(
            existing = emptyList(),
            candidates = listOf(video("aaa", "One", "A"), video("bbb", "Two", "B")),
            limit = 10,
        )
        assertEquals(listOf("aaa", "bbb"), extra.map { it.videoId })
    }

    @Test
    fun `the video cut of a track is the same recording as its audio`() {
        assertTrue(
            QueueBuilder.isSameRecording(
                song("aaa", "Kesariya"),
                song("bbb", "Kesariya (Official Video)"),
            ),
        )
    }

    @Test
    fun `matches across a longer billing of the same credit`() {
        assertTrue(
            QueueBuilder.isSameRecording(
                song("aaa", "Kesariya", "Arijit Singh"),
                song("bbb", "Kesariya | Official Video", "Arijit Singh, Pritam"),
            ),
        )
    }

    @Test
    fun `a remix is not the original`() {
        assertFalse(
            QueueBuilder.isSameRecording(
                song("aaa", "Kesariya"),
                song("bbb", "Kesariya (Remix)"),
            ),
        )
    }

    @Test
    fun `same title from a different artist is a different song`() {
        assertFalse(
            QueueBuilder.isSameRecording(
                song("aaa", "Perfect", "Ed Sheeran"),
                song("bbb", "Perfect", "One Direction"),
            ),
        )
    }

    @Test
    fun `a reordered credit is the same recording`() {
        assertTrue(
            QueueBuilder.isSameRecording(
                song("aaa", "Kalank (Duet)", "Pritam, Arijit Singh & Shilpa Rao"),
                song("bbb", "Kalank (Duet)", "Shilpa Rao, Arijit Singh, & Pritam"),
            ),
        )
    }

    @Test
    fun `topic channels and casing do not affect the credit`() {
        assertEquals(setOf("arijit singh"), QueueBuilder.artistSet("Arijit Singh - Topic"))
        assertEquals(
            setOf("pritam", "arijit singh"),
            QueueBuilder.artistSet("Pritam feat. Arijit Singh"),
        )
    }

    @Test
    fun `extend drops the seed and anything already queued`() {
        val seed = song("aaa", "Kesariya")
        val extra = QueueBuilder.extend(
            existing = listOf(seed),
            candidates = listOf(seed, song("bbb", "Tum Hi Ho"), song("aaa", "Kesariya")),
            limit = 10,
        )
        assertEquals(listOf("bbb"), extra.map { it.videoId })
    }

    @Test
    fun `extend drops a duplicate that only differs by video cut`() {
        val extra = QueueBuilder.extend(
            existing = emptyList(),
            candidates = listOf(
                song("aaa", "Channa Mereya"),
                song("bbb", "Channa Mereya (Official Video)"),
                song("ccc", "Ae Dil Hai Mushkil"),
            ),
            limit = 10,
        )
        assertEquals(listOf("aaa", "ccc"), extra.map { it.videoId })
    }

    @Test
    fun `extend honours the limit`() {
        val candidates = (1..10).map { song("v$it", "Song $it", "Artist $it") }
        assertEquals(3, QueueBuilder.extend(emptyList(), candidates, limit = 3).size)
    }

    @Test
    fun `one artist cannot take over the station`() {
        val candidates = (1..6).map { song("v$it", "Song $it", "Badshah") }
        val extra = QueueBuilder.extend(
            existing = listOf(song("seed", "Seed", "Diljit Dosanjh")),
            candidates = candidates,
            limit = 10,
        )
        assertEquals(2, extra.size)
    }

    @Test
    fun `the seed artist cannot dominate automatic suggestions`() {
        val seed = song("seed", "Seed", "Diljit Dosanjh")
        val candidates = (1..8).map { song("v$it", "Song $it", "Diljit Dosanjh") }
        val extra = QueueBuilder.extend(listOf(seed), candidates, limit = 10)
        assertEquals(2, extra.size)
    }

    @Test
    fun `the cap counts a reordered credit as one artist`() {
        val seed = song("seed", "Seed", "Nucleya")
        val candidates = listOf(
            song("v1", "One", "Pritam, Arijit Singh"),
            song("v2", "Two", "Arijit Singh, Pritam"),
            song("v3", "Three", "Pritam & Arijit Singh"),
        )
        val extra = QueueBuilder.extend(listOf(seed), candidates, limit = 10)
        assertEquals(listOf("v1", "v2"), extra.map { it.videoId })
    }
    @Test
    fun `autoplay excludes alternate versions and covers while manual remixes stay distinct`() {
        val seed = song("seed", "Perfect", "Ed Sheeran")
        val candidates = listOf(song("slow", "Perfect (Slowed + Reverb)", "Ed Sheeran"),
            song("cover", "Perfect (Acoustic Cover)", "Another singer"),
            song("fast", "Perfect - Sped Up", "Ed Sheeran"), song("new", "Photograph", "Ed Sheeran"))
        assertEquals(listOf("new"), QueueBuilder.extend(listOf(seed), candidates, 10).map { it.videoId })
        assertFalse(QueueBuilder.isSameRecording(seed, song("remix", "Perfect (Remix)", "Ed Sheeran")))
        assertTrue(QueueBuilder.extend(listOf(song("slow", "Sajni (Slowed)")), listOf(song("original", "Sajni")), 10).isEmpty())
    }

    @Test
    fun `recommendations interleave artists in source order`() {
        val candidates = listOf(song("a1", "One", "A"), song("a2", "Two", "A"),
            song("b1", "Three", "B"), song("b2", "Four", "B"), song("c1", "Five", "C"))
        assertEquals(listOf("a1", "b1", "a2", "b2", "c1"), QueueBuilder.extend(emptyList(), candidates, 10).map { it.videoId })
        assertTrue(QueueBuilder.extend(emptyList(), candidates, 0).isEmpty())
    }

}
