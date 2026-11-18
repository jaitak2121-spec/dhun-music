package io.github.jaitak2121spec.dhun.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import io.github.jaitak2121spec.dhun.data.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

enum class PlaylistImportSource { SPOTIFY, YOUTUBE }
private data class ImportRow(val id: String, val title: String, val artist: String, val song: io.github.jaitak2121spec.dhun.data.model.Song?)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlaylistImportDialog(source: PlaylistImportSource, onImported: (String) -> Unit, onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()
    val youtube = source == PlaylistImportSource.YOUTUBE
    val service = if (youtube) "YouTube" else "Spotify"
    var link by remember { mutableStateOf("") }
    var playlistTitle by remember { mutableStateOf<String?>(null) }
    var matches by remember { mutableStateOf<List<ImportRow>>(emptyList()) }
    var selected by remember { mutableStateOf<Set<String>>(emptySet()) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Scaffold(modifier = Modifier.statusBarsPadding().navigationBarsPadding().imePadding(), topBar = {
                TopAppBar(title = { Text("Import $service playlist") }, actions = { IconButton(onClick = onDismiss) { Icon(Icons.Rounded.Close, "Close import") } })
            }, bottomBar = {
                if (matches.isNotEmpty() && !busy) Button(enabled = selected.isNotEmpty(), modifier = Modifier.fillMaxWidth().padding(20.dp), onClick = {
                    runCatching {
                        val songs = matches.mapNotNull { it.song }.filter { it.videoId in selected }.distinctBy { it.videoId }
                        val id = DevicePlaylists.create(playlistTitle ?: "Imported playlist", songs)
                        onImported(id)
                    }.onFailure { message = "Could not save the playlist. Check your device storage and try again." }
                }) { Text("Save ${selected.size} songs to Dhun") }
            }) { padding ->
                LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    item {
                        Text("Bring your playlist with you", style = MaterialTheme.typography.headlineSmall)
                        Text("Paste a ${if (youtube) "public or unlisted YouTube / YouTube Music" else "public Spotify"} playlist link. Review the songs before saving them in Dhun.", Modifier.padding(top = 8.dp))
                    }
                    item {
                        OutlinedTextField(value = link, onValueChange = { link = it.take(1000); playlistTitle = null; matches = emptyList(); selected = emptySet(); message = "" },
                            enabled = !busy, singleLine = true, label = { Text("$service playlist link") }, placeholder = { Text(if (youtube) "https://music.youtube.com/playlist?list=…" else "https://open.spotify.com/playlist/…") }, modifier = Modifier.fillMaxWidth())
                    }
                    item {
                        Button(enabled = !busy && link.isNotBlank(), onClick = {
                            scope.launch {
                                busy = true; playlistTitle = null; matches = emptyList(); selected = emptySet(); message = "Reading $service playlist…"
                                try {
                                    if (youtube) {
                                        val loaded = loadYouTubePlaylistPreview(link) { count -> message = "Loaded $count songs…" }
                                        playlistTitle = loaded.title
                                        matches = loaded.songs.map { ImportRow(it.videoId, it.title, it.artist, it) }
                                        message = if (loaded.complete) "${loaded.songs.size} songs ready. Review your selection below."
                                            else "Partial import: ${loaded.songs.size} songs loaded. More songs may remain. You can retry or save this selection."
                                    } else {
                                        val loaded = loadSpotifyPlaylistPreview(link); playlistTitle = loaded.title
                                        message = "Finding matches for ${loaded.tracks.size} songs…"
                                        matches = matchSpotifyPlaylist(loaded) { done, total -> message = "Checking $done of $total songs…" }
                                            .map { ImportRow(it.track.id, it.track.title, it.track.artist, it.song) }
                                        message = "${matches.count { it.song != null }} of ${loaded.tracks.size} songs matched. Review your selection below."
                                    }
                                    selected = matches.mapNotNull { it.song?.videoId }.toSet()
                                } catch (error: CancellationException) { throw error }
                                catch (error: Exception) { message = error.message?.take(250) ?: "Could not read this playlist. Check that it is public and try again." }
                                finally { busy = false }
                            }
                        }, modifier = Modifier.fillMaxWidth()) { Text(if (busy) "Loading songs…" else "Preview playlist") }
                    }
                    item {
                        if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                        Text(message, Modifier.padding(vertical = 8.dp).semantics { liveRegion = LiveRegionMode.Polite })
                        Text(if (youtube) "No sign-in needed. Loads up to 1,000 accessible music tracks. Unavailable songs may be omitted. Saving creates a Dhun playlist; it does not download audio or sync future playlist changes." else "Public previews only, up to 100 songs. Spotify may show only part of a larger playlist. Private playlists aren't supported. Songs are matched to Dhun's music source; audio isn't copied from Spotify.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    playlistTitle?.let { title -> item { Text(title, style = MaterialTheme.typography.titleLarge) } }
                    items(matches, key = { it.id }) { match ->
                        val song = match.song
                        ListItem(headlineContent = { Text(match.title, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                            supportingContent = { Text(if (song == null) "No matching recording found · ${match.artist}" else song.artist, maxLines = 2, overflow = TextOverflow.Ellipsis) },
                            trailingContent = {
                                Checkbox(checked = song != null && song.videoId in selected, enabled = song != null,
                                    onCheckedChange = { checked -> song?.let { selected = if (checked) selected + it.videoId else selected - it.videoId } })
                            })
                    }
                }
            }
        }
    }
}
