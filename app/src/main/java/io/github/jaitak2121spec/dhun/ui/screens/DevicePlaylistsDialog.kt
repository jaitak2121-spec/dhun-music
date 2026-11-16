package io.github.jaitak2121spec.dhun.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.github.jaitak2121spec.dhun.data.DevicePlaylists
import io.github.jaitak2121spec.dhun.data.playlistShareText
import io.github.jaitak2121spec.dhun.data.model.Song
import io.github.jaitak2121spec.dhun.download.Downloads
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun DevicePlaylistsDialog(songToAdd: Song?, queue: List<Song>, onPlay: (List<Song>, Int) -> Unit, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val lists by DevicePlaylists.playlists.collectAsStateWithLifecycle()
    val saved by Downloads.saved.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    var selected by remember { mutableStateOf<String?>(null) }
    var name by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var deleting by remember { mutableStateOf(false) }
    val current = lists.firstOrNull { it.id == selected }
    fun act(block: () -> Unit) { runCatching(block).onFailure { message = it.message ?: "Could not update the playlist." } }
    AlertDialog(onDismissRequest = onDismiss, title = { Text(current?.title ?: "Your playlists") }, text = {
        Column(Modifier.verticalScroll(rememberScrollState())) {
            Text("Saved on this device. Download tracks to listen without internet. Files stay on your phone when you remove a playlist.")
            if (message.isNotBlank()) Text(message)
            if (current == null) {
                OutlinedTextField(value = name, onValueChange = { name = it.take(80) }, label = { Text("Playlist name") })
                TextButton(enabled = name.isNotBlank(), onClick = { act {
                    val id = DevicePlaylists.create(name, listOfNotNull(songToAdd)); name = ""
                    if (songToAdd != null) onDismiss() else selected = id
                } }) { Text("Create playlist") }
                lists.forEach { list ->
                    TextButton(onClick = { act {
                        if (songToAdd != null) { DevicePlaylists.add(list.id, listOf(songToAdd)); onDismiss() }
                        else { selected = list.id; name = list.title }
                    } }) { Text("${list.title} · ${list.songs.size} songs${if (songToAdd != null) " · Add song" else ""}") }
                }
                if (lists.isEmpty()) Text("Make your first playlist, then add songs from a song menu or save your current queue.")
            } else {
                TextButton(onClick = { selected = null; name = ""; deleting = false }) { Text("All playlists") }
                val offline = current.songs.count { it.localUri != null || it.videoId in saved }
                Text("${current.songs.size} songs · $offline available offline")
                TextButton(enabled = current.songs.isNotEmpty(), onClick = { onPlay(current.songs, 0); onDismiss() }) { Text("Play playlist") }
                TextButton(enabled = offline > 0, onClick = { scope.launch {
                    val available = withContext(Dispatchers.IO) { current.songs.mapNotNull { song ->
                        if (song.localUri != null) {
                            val uri = Uri.parse(song.localUri)
                            val readable = uri.scheme in listOf("file", "content") && runCatching {
                                context.contentResolver.openAssetFileDescriptor(uri, "r")?.use { true } ?: false
                            }.getOrDefault(false)
                            song.takeIf { readable }
                        } else Downloads.savedUri(context, song.videoId)?.let { song.copy(localUri = it.toString()) }
                    }
                    }
                    if (available.isEmpty()) message = "These downloads are no longer available." else { onPlay(available, 0); onDismiss() }
                } }) { Text("Play offline") }
                TextButton(enabled = current.songs.any { it.localUri == null && it.videoId !in saved }, onClick = {
                    current.songs.filter { it.localUri == null && it.videoId !in saved }.forEach { Downloads.enqueue(context, it, current.title) }
                    message = "Downloads requested. Check Downloads for progress."
                }) { Text("Download missing songs") }
                TextButton(enabled = queue.isNotEmpty(), onClick = { act { DevicePlaylists.add(current.id, queue); message = "Queue added." } }) { Text("Add current queue") }
                OutlinedTextField(value = name, onValueChange = { name = it.take(80) }, label = { Text("Playlist name") })
                TextButton(enabled = name.isNotBlank(), onClick = { act { DevicePlaylists.rename(current.id, name) } }) { Text("Rename") }
                val shareText = playlistShareText(current)
                TextButton(enabled = shareText != null, onClick = {
                    context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, shareText), "Share playlist"))
                }) { Text("Share playlist links") }
                LazyColumn(Modifier.heightIn(max = 280.dp)) {
                    items(current.songs, key = { it.videoId }) { song ->
                        Row(Modifier.fillMaxWidth()) {
                            Text(song.title, Modifier.weight(1f).padding(vertical = 8.dp))
                            TextButton(onClick = { act { DevicePlaylists.removeTrack(current.id, song.videoId) } }) { Text("Remove") }
                        }
                    }
                }
                if (deleting) Text("Remove this playlist? Downloaded music files will be kept.")
                TextButton(onClick = { if (deleting) act { DevicePlaylists.delete(current.id); selected = null; name = ""; deleting = false } else deleting = true }) {
                    Text(if (deleting) "Confirm delete playlist" else "Delete playlist")
                }
            }
        }
    }, confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } })
}
