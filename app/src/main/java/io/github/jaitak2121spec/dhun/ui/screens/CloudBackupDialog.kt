package io.github.jaitak2121spec.dhun.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.Checkbox
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.foundation.selection.toggleable
import androidx.compose.ui.Alignment
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import io.github.jaitak2121spec.dhun.data.cloud.CloudAccounts
import io.github.jaitak2121spec.dhun.data.settings.AppSettings
import io.github.jaitak2121spec.dhun.data.settings.ColorTheme
import io.github.jaitak2121spec.dhun.data.settings.ThemeMode
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
fun CloudBackupDialog(onDismiss: () -> Unit) {
    val context = LocalContext.current
    val cloud = remember { CloudAccounts(context.applicationContext) }
    val scope = rememberCoroutineScope()
    var connected by remember { mutableStateOf(cloud.connected) }
    var busy by remember { mutableStateOf(false) }
    var consent by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("Backups are optional and manual. Nothing uploads automatically.") }
    var pendingUpload by remember { mutableStateOf<JSONObject?>(null) }
    var pendingRestore by remember { mutableStateOf<JSONObject?>(null) }
    fun perform(action: suspend () -> Unit) {
        if (busy) return
        scope.launch {
            busy = true
            try { action(); connected = cloud.connected }
            catch (error: CancellationException) { throw error }
            catch (error: Exception) { message = error.message ?: "Cloud request failed. Your local data is safe." }
            finally { connected = cloud.connected; busy = false }
        }
    }
    suspend fun awaitSignIn() {
        repeat(100) {
            delay(3000)
            if (cloud.poll()) {
                message = "Signed in to Dhun. Backups remain optional."
                return
            }
        }
        error("Sign-in expired. Start again from Dhun.")
    }
    LaunchedEffect(Unit) {
        if (!connected && cloud.pending) perform {
            message = "Finishing your secure browser sign-in…"
            awaitSignIn()
        }
    }
    LaunchedEffect(connected) {
        if (connected) perform {
            val account = cloud.account()
            message = "Signed in as ${account.optString("name")} · ${account.getString("email")}. Backups remain optional."
        }
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Your Dhun account") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                Text("Sign in with Google in your secure browser. After you approve this device, the browser returns to Dhun. Recommendations learn on this device; YouTube Music and backups remain optional.")
                Spacer(Modifier.height(12.dp))
                Text("The Dhun owner can access data you choose to store. Google credentials, listening history, audio files and local paths are excluded.")
                Spacer(Modifier.height(12.dp))
                if (!connected) {
                    Text("Dhun and its account provider store your account ID, name, email and available profile photo. The Dhun owner can access account details to operate the service. Listening history, audio files and local paths are not uploaded. You can export your data or delete your account in Privacy & manage data.")
                    Row(Modifier.fillMaxWidth().toggleable(value = consent, enabled = !busy, role = Role.Checkbox,
                        onValueChange = { consent = it }), verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = consent, onCheckedChange = null, enabled = !busy)
                        Text("I agree to the account privacy notice and storing these account details.")
                    }
                    if (!consent) Text("Accept the privacy notice above to enable Google sign-in.")
                    Text(message, Modifier.semantics { liveRegion = LiveRegionMode.Polite })
                    if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                    TextButton(enabled = !busy && consent, onClick = { perform {
                        message = "Opening secure browser sign-in…"
                        val data = cloud.start()
                        message = "Finish Google sign-in and approve code ${data.getString("userCode")} in your browser. Dhun will reconnect automatically."
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(data.getString("verificationUrl"))))
                        awaitSignIn()
                    } }) { Text(if (busy) "Waiting for browser sign-in…" else "Continue with Google") }
                } else {
                    Text(message, Modifier.semantics { liveRegion = LiveRegionMode.Polite })
                    if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                    TextButton(enabled = !busy, onClick = { perform {
                        val profile = cloud.backup().optJSONObject("profile")?.takeIf { !it.isNull("backup_consented_at") } ?: error("Enable optional backups in Privacy & manage data first.")
                        pendingUpload = profile
                        pendingRestore = null
                        message = "Replace cloud appearance settings with this device's theme and animation preference? Existing cloud favourites will be kept."
                    } }) { Text("Upload appearance backup") }
                    pendingUpload?.let { profile ->
                        TextButton(enabled = !busy, onClick = { perform {
                            val theme = when (AppSettings.colorTheme.value) { ColorTheme.INDIGO -> "indigo"; ColorTheme.FOREST -> "forest"; else -> "monochrome" }
                            cloud.upload(JSONObject().put("revision", profile.getInt("revision")).put("favourites", profile.getJSONArray("favourites"))
                                .put("preferences", JSONObject().put("theme", theme).put("appearance", AppSettings.themeMode.value.name.lowercase()).put("reduceMotion", AppSettings.reduceAnimation.value)))
                            pendingUpload = null
                            message = "Appearance backed up. Existing cloud favourites were kept."
                        } }) { Text("Confirm upload") }
                    }
                    TextButton(enabled = !busy, onClick = { perform {
                        val profile = cloud.backup().optJSONObject("profile") ?: error("There is no backup to restore.")
                        pendingRestore = profile.optJSONObject("preferences") ?: error("There are no appearance settings to restore.")
                        pendingUpload = null
                        message = "Apply the cloud theme and animation preference? Your YouTube likes and local music will stay as they are."
                    } }) { Text("Restore appearance") }
                    pendingRestore?.let { preferences ->
                        TextButton(enabled = !busy, onClick = { perform {
                            AppSettings.setColorTheme(when (preferences.getString("theme")) { "indigo" -> ColorTheme.INDIGO; "forest" -> ColorTheme.FOREST; else -> ColorTheme.MONO })
                            AppSettings.setThemeMode(ThemeMode.valueOf(preferences.getString("appearance").uppercase()))
                            AppSettings.setReduceAnimation(preferences.getBoolean("reduceMotion"))
                            pendingRestore = null
                            message = "Cloud appearance settings restored."
                        } }) { Text("Confirm restore") }
                    }
                    TextButton(enabled = !busy, onClick = { perform { cloud.disconnect(); pendingRestore = null; pendingUpload = null; message = "Disconnected. Your cloud backup remains in your account." } }) { Text("Disconnect account") }
                    TextButton(enabled = !busy, onClick = { perform { cloud.forget(); pendingRestore = null; pendingUpload = null; message = "Local connection removed. Server access expires within 30 days; Erase cloud backup in your account revokes all devices immediately." } }) { Text("Forget local connection") }
                }
                TextButton(enabled = !busy, onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(CloudAccounts.URL))) }) { Text("Privacy & manage data") }
                Text("Export, erase backups or delete your account in the portal. Connecting does not sign you in to YouTube.")
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } },
    )
}
