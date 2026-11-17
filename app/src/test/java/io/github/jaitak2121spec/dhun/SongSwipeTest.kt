package io.github.jaitak2121spec.dhun

import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.SwipeToDismissBoxValue
import io.github.jaitak2121spec.dhun.data.model.Song
import io.github.jaitak2121spec.dhun.data.model.QueueTier
import io.github.jaitak2121spec.dhun.playback.QueueCoordinator
import io.github.jaitak2121spec.dhun.ui.components.songSwipePlayNext
import org.junit.Assert.*
import org.junit.Test

@OptIn(ExperimentalMaterial3Api::class)
class SongSwipeTest {
    @Test fun `opposite row gestures choose different queue positions and settled does nothing`() {
        val timeline = listOf(
            Song("now", "Now", "Artist", null),
            Song("first", "First request", "Artist", null, queueTier = QueueTier.USER_QUEUE),
            Song("second", "Second request", "Artist", null, queueTier = QueueTier.USER_QUEUE),
            Song("album", "Album", "Artist", null),
        )
        assertEquals(1, QueueCoordinator.findUserQueueInsertionIndex(timeline, 0, songSwipePlayNext(SwipeToDismissBoxValue.StartToEnd)!!))
        assertEquals(3, QueueCoordinator.findUserQueueInsertionIndex(timeline, 0, songSwipePlayNext(SwipeToDismissBoxValue.EndToStart)!!))
        assertNull(songSwipePlayNext(SwipeToDismissBoxValue.Settled))
    }
}
