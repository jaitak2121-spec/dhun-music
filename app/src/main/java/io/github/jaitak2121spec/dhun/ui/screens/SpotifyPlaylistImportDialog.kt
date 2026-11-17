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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SpotifyPlaylistImportDialog(onImported: (String) -> Unit, onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()
    var link by remember { mutableStateOf("") }
    var preview by remember { mutableStateOf<SpotifyPlaylistPreview?>(null) }
    var matches by remember { mutableStateOf<List<SpotifyImportMatch>>(emptyList()) }
    var selected by remember { mutableStateOf<Set<String>>(emptySet()) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Scaffold(modifier = Modifier.statusBarsPadding().navigationBarsPadding().imePadding(), topBar = {
                TopAppBar(title = { Text("Import Spotify playlist") }, actions = { IconButton(onClick = onDismiss) { Icon(Icons.Rounded.Close, "Close import") } })
            }, bottomBar = {
                if (matches.isNotEmpty() && !busy) Button(enabled = selected.isNotEmpty(), modifier = Modifier.fillMaxWidth().padding(20.dp), onClick = {
                    runCatching {
                        val songs = matches.mapNotNull { it.song }.filter { it.videoId in selected }.distinctBy { it.videoId }
                        val id = DevicePlaylists.create(preview?.title ?: "Imported playlist", songs)
                        onImported(id)
                    }.onFailure { message = "Could not save the playlist. Check your device storage and try again." }
                }) { Text("Save ${selected.size} songs to Dhun") }
            }) { padding ->
                LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    item {
                        Text("Bring your playlist with you", style = MaterialTheme.typography.headlineSmall)
                        Text("Paste a public Spotify playlist link. Review matching songs before saving them in Dhun.", Modifier.padding(top = 8.dp))
                    }
                    item {
                        OutlinedTextField(value = link, onValueChange = { link = it.take(1000); preview = null; matches = emptyList(); selected = emptySet(); message = "" },
                            enabled = !busy, singleLine = true, label = { Text("Spotify playlist link") }, placeholder = { Text("https://open.spotify.com/playlist/…") }, modifier = Modifier.fillMaxWidth())
                    }
                    item {
                        Button(enabled = !busy && link.isNotBlank(), onClick = {
                            scope.launch {
                                busy = true; preview = null; matches = emptyList(); selected = emptySet(); message = "Reading Spotify's public preview…"
                                try {
                                    val loaded = loadSpotifyPlaylistPreview(link); preview = loaded
                                    message = "Finding matches for ${loaded.tracks.size} songs…"
                                    matches = matchSpotifyPlaylist(loaded) { done, total -> message = "Checking $done of $total songs…" }
                                    selected = matches.mapNotNull { it.song?.videoId }.toSet()
                                    message = "${matches.count { it.song != null }} of ${loaded.tracks.size} songs matched. Review your selection below."
                                } catch (error: CancellationException) { throw error }
                                catch (error: Exception) { message = error.message?.take(250) ?: "Could not read this playlist. Check that it is public and try again." }
                                finally { busy = false }
                            }
                        }, modifier = Modifier.fillMaxWidth()) { Text(if (busy) "Finding songs…" else "Find songs") }
                    }
                    item {
                        if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                        Text(message, Modifier.padding(vertical = 8.dp).semantics { liveRegion = LiveRegionMode.Polite })
                        Text("Public previews only, up to 100 songs. Spotify may show only part of a larger playlist. Private playlists aren't supported. Songs are matched to Dhun's music source; audio isn't copied from Spotify.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    preview?.let { list -> item { Text(list.title, style = MaterialTheme.typography.titleLarge) } }
                    items(matches, key = { it.track.id }) { match ->
                        val song = match.song
                        ListItem(headlineContent = { Text(match.track.title, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                            supportingContent = { Text(if (song == null) "No matching recording found · ${match.track.artist}" else song.artist, maxLines = 2, overflow = TextOverflow.Ellipsis) },
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
