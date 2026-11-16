package io.github.jaitak2121spec.dhun.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import io.github.jaitak2121spec.dhun.data.DiscoveryTaste
import io.github.jaitak2121spec.dhun.data.settings.AppSettings

@Composable
internal fun DiscoveryTasteDialog(onDismiss: () -> Unit, onSaved: () -> Unit) {
    val saved = AppSettings.discoveryTaste.value
    var language by remember { mutableStateOf(saved.language) }
    var artists by remember { mutableStateOf(saved.artists) }
    var learn by remember { mutableStateOf(AppSettings.discoveryLearning.value) }
    var genres by remember { mutableStateOf(saved.genres) }
    fun save(taste: DiscoveryTaste) { AppSettings.setDiscoveryLearning(learn); AppSettings.setDiscoveryTaste(taste); onSaved(); onDismiss() }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Find your kind of music") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Choose what you want to hear. Any field can be left blank. These choices guide discovery; they are not strict language filters.")
                Text("Dhun learns from qualified listening on this device and mixes in broader discoveries. Listening history is not uploaded to Dhun Cloud; artist searches go to the music source.")
                Checkbox(checked = learn, onCheckedChange = { learn = it }, modifier = Modifier.semantics { contentDescription = "Learn from listening on this device" })
                Text("Learn from listening on this device")
                OutlinedTextField(language, { language = it.take(40) }, label = { Text("Music language") }, placeholder = { Text("English, Hindi, Punjabi…") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(artists, { artists = it.take(160) }, label = { Text("Up to 3 artists, separated by commas") }, placeholder = { Text("Your favourite artists") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(genres, { genres = it.take(60) }, label = { Text("Genres or a mood") }, placeholder = { Text("Indie, acoustic, electronic…") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Text("Preferences stay on this device. Discovery searches go to the music source. They are not uploaded to Dhun Cloud, and no listening history is uploaded.")
                TextButton(onClick = { save(DiscoveryTaste()) }) { Text("Reset discovery preferences") }
            }
        },
        confirmButton = { TextButton(onClick = { save(DiscoveryTaste(language, artists, genres)) }) { Text("Save and refresh") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
