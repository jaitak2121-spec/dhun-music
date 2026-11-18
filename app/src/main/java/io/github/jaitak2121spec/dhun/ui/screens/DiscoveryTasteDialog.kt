package io.github.jaitak2121spec.dhun.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import io.github.jaitak2121spec.dhun.data.DiscoveryTaste
import io.github.jaitak2121spec.dhun.data.toggleTasteSelection
import io.github.jaitak2121spec.dhun.data.settings.AppSettings

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
internal fun DiscoveryTasteDialog(onDismiss: () -> Unit, onSaved: () -> Unit) {
    val saved = AppSettings.discoveryTaste.value
    var language by remember { mutableStateOf(saved.language) }
    var artists by remember { mutableStateOf(saved.artists.split(',').map { it.trim() }.filter { it.isNotEmpty() }.distinct().take(3)) }
    var genres by remember { mutableStateOf(saved.genres.split(',').map { it.trim() }.filter { it.isNotEmpty() }.distinct().take(3)) }
    var learn by remember { mutableStateOf(AppSettings.discoveryLearning.value) }
    var step by remember { mutableIntStateOf(0) }
    fun save(taste: DiscoveryTaste) {
        AppSettings.setDiscoveryLearning(learn)
        AppSettings.setDiscoveryTaste(taste)
        onSaved()
        onDismiss()
    }
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background, contentColor = MaterialTheme.colorScheme.onBackground) {
            Scaffold(modifier = Modifier.statusBarsPadding().navigationBarsPadding(), topBar = {
                TopAppBar(title = { Text("Make Dhun yours") }, actions = { IconButton(onClick = onDismiss) { Icon(Icons.Rounded.Close, "Close music profile") } })
            }, bottomBar = {
                Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Your choices stay on this device.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (step > 0) OutlinedButton(onClick = { step-- }, modifier = Modifier.weight(1f)) { Text("Back") }
                        Button(onClick = {
                            if (step < 2) step++ else save(DiscoveryTaste(language, artists.joinToString(", "), genres.joinToString(", ")))
                        }, modifier = Modifier.weight(1f)) { Text(if (step == 2) "Start listening" else "Next") }
                    }
                }
            }) { padding ->
                Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    LinearProgressIndicator(progress = { (step + 1) / 3f }, modifier = Modifier.fillMaxWidth())
                    Text("${step + 1} of 3 · ${listOf("Language", "Your sound", "Artists")[step]}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(listOf("What language moves you?", "What's your kind of sound?", "Who do you love listening to?")[step], style = MaterialTheme.typography.headlineLarge)
                    Text(if (step == 0) "Choose a favourite, or keep it open." else "Pick up to 3. You can leave this step blank.")
                    val options = when (step) {
                        0 -> listOf("", "English", "Hindi", "Punjabi", "Urdu", "Bengali", "Tamil", "Telugu", "Malayalam", "Kannada", "Marathi", "Gujarati", "Spanish", "Korean", "Japanese", "Arabic") + listOf(language).filter { it.isNotBlank() }
                        1 -> genres + listOf("Pop", "Hip-hop", "R&B", "Indie", "Rock", "Electronic", "Acoustic", "Classical", "Jazz", "Lo-fi", "Dance", "Romantic", "Chill", "Focus", "Workout")
                        else -> artists + suggestedArtists(language)
                    }
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        options.distinct().forEach { choice ->
                            val selected = when (step) { 0 -> language == choice; 1 -> choice in genres; else -> choice in artists }
                            val available = step == 0 || selected || (if (step == 1) genres.size else artists.size) < 3
                            FilterChip(selected = selected, enabled = available, label = { Text(choice.ifEmpty { "Any language" }) }, onClick = {
                                when (step) {
                                    0 -> language = choice
                                    1 -> genres = toggleTasteSelection(genres, choice, 3)
                                    else -> artists = toggleTasteSelection(artists, choice, 3)
                                }
                            })
                        }
                    }
                    if (step == 2) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                            Column(Modifier.weight(1f)) {
                                Text("Learn as I listen", style = MaterialTheme.typography.titleMedium)
                                Text("Listening history stays on this device.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Switch(checked = learn, onCheckedChange = { learn = it })
                        }
                        TextButton(onClick = { save(DiscoveryTaste()) }) { Text("Reset my music taste") }
                    }
                }
            }
        }
    }
}

private fun suggestedArtists(language: String): List<String> = when (language) {
    "Hindi" -> listOf("Arijit Singh", "Shreya Ghoshal", "A.R. Rahman", "Pritam", "Sunidhi Chauhan", "Armaan Malik", "Jubin Nautiyal", "Sonu Nigam")
    "Punjabi" -> listOf("Diljit Dosanjh", "Karan Aujla", "AP Dhillon", "Shubh", "Sidhu Moose Wala", "Amrinder Gill", "Gurdas Maan")
    "Urdu" -> listOf("Talha Anjum", "Young Stunners", "Atif Aslam", "Ali Sethi", "Hasan Raheem", "Talhah Yunus", "Nusrat Fateh Ali Khan")
    "Tamil", "Telugu", "Malayalam", "Kannada" -> listOf("A.R. Rahman", "Anirudh Ravichander", "Sid Sriram", "Shreya Ghoshal", "S. P. Balasubrahmanyam", "K. S. Chithra")
    "Korean" -> listOf("BTS", "BLACKPINK", "TWICE", "IU", "Stray Kids", "SEVENTEEN")
    "Japanese" -> listOf("YOASOBI", "Ado", "Kenshi Yonezu", "Fujii Kaze", "RADWIMPS", "Hikaru Utada")
    "Spanish" -> listOf("Bad Bunny", "KAROL G", "Shakira", "Rosalía", "Rauw Alejandro", "J Balvin")
    "Arabic" -> listOf("Amr Diab", "Fairuz", "Nancy Ajram", "Elissa", "Mohamed Hamaki")
    else -> listOf("The Weeknd", "Taylor Swift", "Billie Eilish", "Drake", "Dua Lipa", "Ed Sheeran", "Ariana Grande", "Coldplay", "Daft Punk", "Arijit Singh", "Diljit Dosanjh", "Atif Aslam")
}
