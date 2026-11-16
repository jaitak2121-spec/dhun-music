package io.github.jaitak2121spec.dhun

import io.github.jaitak2121spec.dhun.data.DevicePlaylist
import io.github.jaitak2121spec.dhun.data.playlistShareText
import io.github.jaitak2121spec.dhun.data.model.Song
import io.github.jaitak2121spec.dhun.ui.screens.homeGreeting
import org.junit.Assert.*
import org.junit.Test

class DevicePlaylistShareTest {
    @Test fun `sharing excludes local files and non YouTube sources`() {
        val remote = Song("dQw4w9WgXcQ", "Public song", "Artist", null)
        val local = Song("local-file", "Private recording", "Me", null, localUri = "content://private/123", localPath = "/private/recording.mp3")
        val source = Song("addon:private-library", "Library track", "Me", null)
        val text = playlistShareText(DevicePlaylist("list", "My mix", listOf(remote, local, source)))!!
        assertTrue(text.contains("https://music.youtube.com/watch?v=dQw4w9WgXcQ"))
        assertFalse(text.contains("Private recording")); assertFalse(text.contains("content://")); assertFalse(text.contains("/private/"))
        assertNull(playlistShareText(DevicePlaylist("list", "Private mix", listOf(local, source))))
    }
    @Test fun `greetings use a bounded first name only occasionally`() {
        assertEquals("Hi, Jai", homeGreeting(" Jai Tak ", 0))
        assertEquals("Hi, आरव", homeGreeting("आरव शर्मा", 0))
        assertFalse(homeGreeting("Jai Tak", 1).contains("Jai"))
        assertFalse(homeGreeting("Jai Tak", 2).contains("Jai"))
    }
}
