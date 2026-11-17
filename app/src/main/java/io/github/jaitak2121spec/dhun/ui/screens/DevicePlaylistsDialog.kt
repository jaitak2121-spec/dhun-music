package io.github.jaitak2121spec.dhun.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import io.github.jaitak2121spec.dhun.data.DevicePlaylists
import io.github.jaitak2121spec.dhun.data.YtMusicRepository
import io.github.jaitak2121spec.dhun.data.playlistShareText
import io.github.jaitak2121spec.dhun.data.model.SearchFilter
import io.github.jaitak2121spec.dhun.data.model.SearchResult
import io.github.jaitak2121spec.dhun.data.model.Song
import io.github.jaitak2121spec.dhun.download.Downloads
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DevicePlaylistsDialog(
    songToAdd: Song?, queue: List<Song>, onPlay: (List<Song>, Int) -> Unit, onDismiss: () -> Unit,
    initialPlaylistId: String? = null, startCreating: Boolean = false,
) {
    val context = LocalContext.current
    val lists by DevicePlaylists.playlists.collectAsStateWithLifecycle()
    val saved by Downloads.saved.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    var selected by remember { mutableStateOf(initialPlaylistId) }
    var editing by remember { mutableStateOf(startCreating) }
    var renaming by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("My playlist ${lists.size + 1}") }
    var message by remember { mutableStateOf("") }
    var deleting by remember { mutableStateOf(false) }
    var menu by remember { mutableStateOf(false) }
    var adding by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<Song>>(emptyList()) }
    var searching by remember { mutableStateOf(false) }
    val current = lists.firstOrNull { it.id == selected }
    fun act(block: () -> Unit) { runCatching(block).onFailure { message = it.message ?: "Could not update your playlist." } }
    fun back() {
        message = ""
        if (adding) { adding = false; query = "" }
        else if (selected != null && initialPlaylistId == null) selected = null
        else onDismiss()
    }
    fun saveName() = act {
        if (renaming) current?.let { DevicePlaylists.rename(it.id, name) }
        else {
            selected = DevicePlaylists.create(name, listOfNotNull(songToAdd))
            if (songToAdd != null) onDismiss() else adding = true
        }
        editing = false
    }
    LaunchedEffect(adding, query) {
        results = emptyList()
        if (!adding || query.trim().length < 2) { searching = false; return@LaunchedEffect }
        searching = true
        try {
            delay(400)
            results = YtMusicRepository.search(query.trim(), SearchFilter.SONGS).getOrThrow()
                .filterIsInstance<SearchResult.Track>().map { it.song }.distinctBy { it.videoId }.take(30)
        } catch (error: CancellationException) { throw error }
        catch (error: Exception) { message = "Search is unavailable. Try again or add songs from your queue." }
        finally { searching = false }
    }
    Dialog(onDismissRequest = ::back, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Scaffold(
                modifier = Modifier.statusBarsPadding().navigationBarsPadding().imePadding(),
                topBar = {
                    TopAppBar(title = { Text(if (adding) "Add songs" else if (songToAdd != null) "Add to playlist" else "Your playlists") },
                        navigationIcon = { IconButton(onClick = ::back) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, "Back") } },
                        actions = {
                            if (adding) TextButton(onClick = { adding = false; query = "" }) { Text("Done") }
                            else if (current != null) Box {
                                IconButton(onClick = { menu = true }) { Icon(Icons.Rounded.MoreVert, "Playlist options") }
                                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                                    DropdownMenuItem(text = { Text("Rename") }, onClick = { menu = false; renaming = true; name = current.title; editing = true })
                                    DropdownMenuItem(text = { Text("Add current queue") }, enabled = queue.isNotEmpty(), onClick = {
                                        menu = false; act { DevicePlaylists.add(current.id, queue); message = "Queue added." }
                                    })
                                    val share = playlistShareText(current)
                                    DropdownMenuItem(text = { Text("Share playlist links") }, enabled = share != null, onClick = {
                                        menu = false
                                        act { context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, share), "Share playlist")) }
                                    })
                                    DropdownMenuItem(text = { Text("Delete playlist") }, onClick = { menu = false; deleting = true })
                                }
                            }
                            IconButton(onClick = onDismiss) { Icon(Icons.Rounded.Close, "Close playlists") }
                        })
                },
            ) { padding ->
                LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(bottom = 24.dp)) {
                    if (message.isNotBlank()) item {
                        Text(message, Modifier.padding(20.dp).semantics { liveRegion = LiveRegionMode.Polite }, color = MaterialTheme.colorScheme.primary)
                    }
                    if (current == null) {
                        item {
                            Column(Modifier.padding(horizontal = 20.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                songToAdd?.let { Text("Choose a playlist for ${it.title}.") }
                                Button(onClick = { renaming = false; name = "My playlist ${lists.size + 1}"; editing = true }, modifier = Modifier.fillMaxWidth()) {
                                    Icon(Icons.Rounded.Add, null); Spacer(Modifier.width(8.dp)); Text("New playlist")
                                }
                                if (lists.isEmpty()) {
                                    Text("A place for your favourites", style = MaterialTheme.typography.headlineSmall)
                                    Text("Create a playlist, then search and add songs right here. No account needed.")
                                }
                            }
                        }
                        itemsIndexed(lists, key = { _, list -> list.id }) { _, list ->
                            ListItem(headlineContent = { Text(list.title, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                supportingContent = { Text("${list.songs.size} songs · On this device") },
                                leadingContent = { PlaylistArtwork(list.songs.firstOrNull()) },
                                trailingContent = { Icon(if (songToAdd != null) Icons.Rounded.Add else Icons.Rounded.ChevronRight, null) },
                                modifier = Modifier.clickable { act {
                                    if (songToAdd != null) { DevicePlaylists.add(list.id, listOf(songToAdd)); onDismiss() }
                                    else selected = list.id
                                } })
                        }
                    } else if (adding) {
                        item {
                            Column(Modifier.padding(horizontal = 20.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text(current.title, style = MaterialTheme.typography.titleMedium)
                                OutlinedTextField(value = query, onValueChange = { query = it.take(160); message = "" }, modifier = Modifier.fillMaxWidth(),
                                    singleLine = true, label = { Text("Find songs or artists") }, leadingIcon = { Icon(Icons.Rounded.Search, null) },
                                    trailingIcon = { if (query.isNotEmpty()) IconButton(onClick = { query = "" }) { Icon(Icons.Rounded.Close, "Clear search") } })
                                if (searching) LinearProgressIndicator(Modifier.fillMaxWidth())
                                if (query.trim().length < 2) Text(if (queue.isEmpty()) "Search for a song to start your playlist." else "From your current queue")
                                else if (!searching && results.isEmpty() && message.isBlank()) Text("No songs found. Try another title or artist.")
                            }
                        }
                        val candidates = if (query.trim().length < 2) queue.distinctBy { it.videoId }.take(30) else results
                        itemsIndexed(candidates, key = { _, song -> song.videoId }) { _, song ->
                            val added = current.songs.any { it.videoId == song.videoId }
                            ListItem(headlineContent = { Text(song.title, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                supportingContent = { Text(song.artist, maxLines = 1) }, leadingContent = { PlaylistArtwork(song) },
                                trailingContent = {
                                    IconButton(enabled = !added, onClick = { act { DevicePlaylists.add(current.id, listOf(song)) } }) {
                                        Icon(if (added) Icons.Rounded.CheckCircle else Icons.Rounded.AddCircleOutline, if (added) "${song.title} added" else "Add ${song.title}")
                                    }
                                }, modifier = Modifier.clickable(enabled = !added) { act { DevicePlaylists.add(current.id, listOf(song)) } })
                        }
                    } else {
                        item {
                            val offline = current.songs.count { it.localUri != null || it.videoId in saved }
                            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                PlaylistArtwork(current.songs.firstOrNull(), large = true)
                                Text(current.title, style = MaterialTheme.typography.headlineLarge)
                                Text("${current.songs.size} songs · $offline available offline", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Button(enabled = current.songs.isNotEmpty(), onClick = { onPlay(current.songs, 0); onDismiss() }) { Icon(Icons.Rounded.PlayArrow, null); Text("Play") }
                                    OutlinedButton(onClick = { adding = true }) { Icon(Icons.Rounded.Add, null); Text("Add songs") }
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    TextButton(enabled = current.songs.any { it.localUri == null && it.videoId !in saved }, onClick = {
                                        current.songs.filter { it.localUri == null && it.videoId !in saved }.forEach { Downloads.enqueue(context, it, current.title) }
                                        message = "Downloads requested. See Downloads for progress."
                                    }) { Text("Download songs") }
                                    TextButton(enabled = offline > 0, onClick = { scope.launch {
                                        val available = withContext(Dispatchers.IO) { current.songs.mapNotNull { song ->
                                            if (song.localUri != null) {
                                                val uri = Uri.parse(song.localUri)
                                                song.takeIf { uri.scheme in listOf("file", "content") && runCatching {
                                                    context.contentResolver.openAssetFileDescriptor(uri, "r")?.use { true } ?: false
                                                }.getOrDefault(false) }
                                            } else Downloads.savedUri(context, song.videoId)?.let { song.copy(localUri = it.toString()) }
                                        } }
                                        if (available.isEmpty()) message = "These downloads are no longer available." else { onPlay(available, 0); onDismiss() }
                                    } }) { Text("Play offline") }
                                }
                                if (current.songs.isEmpty()) Text("Let's find the first song for this playlist. Tap Add songs to search.")
                            }
                        }
                        itemsIndexed(current.songs, key = { _, song -> song.videoId }) { index, song ->
                            ListItem(headlineContent = { Text(song.title, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                supportingContent = { Text(song.artist, maxLines = 1) }, leadingContent = { PlaylistArtwork(song) },
                                trailingContent = { IconButton(onClick = { act { DevicePlaylists.removeTrack(current.id, song.videoId) } }) { Icon(Icons.Rounded.RemoveCircleOutline, "Remove ${song.title}") } },
                                modifier = Modifier.clickable { onPlay(current.songs, index); onDismiss() })
                        }
                    }
                }
            }
            if (editing) {
                val focus = remember { FocusRequester() }
                LaunchedEffect(Unit) { focus.requestFocus() }
                AlertDialog(onDismissRequest = { editing = false }, title = { Text(if (renaming) "Rename playlist" else "Name your playlist") }, text = {
                    OutlinedTextField(value = name, onValueChange = { name = it.take(80) }, modifier = Modifier.fillMaxWidth().focusRequester(focus),
                        singleLine = true, label = { Text("Playlist name") }, keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { if (name.isNotBlank()) saveName() }))
                }, confirmButton = { TextButton(enabled = name.isNotBlank(), onClick = ::saveName) { Text(if (renaming) "Save" else "Create") } },
                    dismissButton = { TextButton(onClick = { editing = false }) { Text("Cancel") } })
            }
            if (deleting && current != null) AlertDialog(onDismissRequest = { deleting = false }, title = { Text("Delete ${current.title}?") },
                text = { Text("Downloaded music files will stay on your phone.") }, confirmButton = { TextButton(onClick = { act { DevicePlaylists.delete(current.id); selected = null; deleting = false } }) { Text("Delete") } },
                dismissButton = { TextButton(onClick = { deleting = false }) { Text("Keep playlist") } })
        }
    }
}

@Composable
private fun PlaylistArtwork(song: Song?, large: Boolean = false) {
    Box(Modifier.size(if (large) 144.dp else 56.dp).clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.surfaceContainerHigh), contentAlignment = Alignment.Center) {
        if (song?.thumbnailUrl != null) AsyncImage(model = song.thumbnailUrl, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        else Icon(Icons.Rounded.LibraryMusic, null, Modifier.size(if (large) 56.dp else 24.dp))
    }
}
