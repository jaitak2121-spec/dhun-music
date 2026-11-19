package io.github.jaitak2121spec.dhun.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.LinearProgressIndicator
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
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
fun CloudBackupDialog(onDismiss: () -> Unit, onTasteChanged: () -> Unit = {}) {
    val context = LocalContext.current
    val cloud = remember { CloudAccounts(context.applicationContext) }
    val scope = rememberCoroutineScope()
    val activityEnabled by CloudAccounts.activityEnabled.collectAsStateWithLifecycle()
    val profile by CloudAccounts.profile.collectAsStateWithLifecycle()
    var optionsExpanded by remember { mutableStateOf(false) }
    var showTaste by remember { mutableStateOf(false) }
    if (showTaste) DiscoveryTasteDialog(onDismiss = { showTaste = false }, onSaved = { onTasteChanged(); onDismiss() })
    var connected by remember { mutableStateOf(cloud.connected) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
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
                cloud.account()
                connected = true
                message = "You're signed in. Welcome to Dhun."
                showTaste = !AppSettings.discoveryTaste.value.configured
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
            cloud.account()
            message = ""
        }
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Box(Modifier.size(64.dp).background(MaterialTheme.colorScheme.surfaceContainerHigh, CircleShape), contentAlignment = Alignment.Center) {
                Text(if (connected) profileInitial(profile?.name.orEmpty()) else "♪", style = MaterialTheme.typography.headlineLarge)
            }
        },
        title = { Text(if (connected) profile?.name?.takeIf { it.isNotBlank() }?.let { homeGreeting(it, 0) } ?: "Your Dhun profile" else "Make Dhun yours") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                if (!connected) {
                    Text("Sign in, then choose the languages, sounds and artists you love.")
                    Spacer(Modifier.height(12.dp))
                    Text("Dhun saves your Google name, email and profile photo for your account.", style = MaterialTheme.typography.bodySmall)
                    Text(message, Modifier.semantics { liveRegion = LiveRegionMode.Polite })
                    if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                    Button(modifier = Modifier.fillMaxWidth(), enabled = !busy, onClick = { perform {
                        message = "Opening Google…"
                        val data = cloud.start()
                        message = "Finish signing in. You’ll return to Dhun automatically."
                        CustomTabsIntent.Builder().setShowTitle(true).build()
                            .launchUrl(context, Uri.parse(data.getString("verificationUrl")))
                        awaitSignIn()
                    } }) { Text(if (busy) "Signing in…" else "Continue with Google") }
                    TextButton(enabled = !busy, onClick = { showTaste = true }) { Text("Continue without signing in") }
                } else {
                    Text(profile?.name.orEmpty(), style = MaterialTheme.typography.titleLarge)
                    Text(profile?.email.orEmpty(), style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.height(12.dp))
                    Text(message, Modifier.semantics { liveRegion = LiveRegionMode.Polite })
                    if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                    if (profile == null && !busy) TextButton(onClick = { perform { cloud.account(); message = "" } }) { Text("Refresh profile") }
                    Button(enabled = !busy, modifier = Modifier.fillMaxWidth(), onClick = { showTaste = true }) { Text("Your music profile") }
                    Text("Account activity", style = MaterialTheme.typography.titleMedium)
                    Text("Share active dates, app version and platform with your account to help improve Dhun. No songs or listening time. Kept for 90 days; turning off deletes activity.", style = MaterialTheme.typography.bodySmall)
                    TextButton(enabled = !busy, onClick = { perform {
                        val enabled = !activityEnabled
                        val synced = cloud.setActivityEnabled(enabled)
                        message = if (!synced) "Sharing stopped on this device. Server deletion will retry when online. Keep your account connected until it completes." else if (enabled) "Account activity sharing enabled." else "Account activity sharing stopped and deleted."
                    } }) { Text(if (activityEnabled) "Turn off account activity" else "Enable account activity") }
                    TextButton(onClick = { optionsExpanded = !optionsExpanded }) { Text(if (optionsExpanded) "Hide backup options" else "Appearance backups") }
                    if (optionsExpanded) {
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
                        message = "Apply the cloud theme and animation preference? Your playlists and local music will stay as they are."
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
                    }
                    TextButton(enabled = !busy, onClick = { perform { cloud.disconnect(); pendingRestore = null; pendingUpload = null; message = "Disconnected. Your cloud backup remains in your account." } }) { Text("Sign out") }
                    if (optionsExpanded) TextButton(enabled = !busy, onClick = { perform { cloud.forget(); pendingRestore = null; pendingUpload = null; message = "Local connection removed. Server access expires within 30 days; Erase cloud backup in your account revokes all devices immediately." } }) { Text("Forget local connection") }
                }
                TextButton(enabled = !busy, onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(CloudAccounts.URL))) }) { Text("Privacy & manage data") }
                Text("Listening history stays on your device.")
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } },
    )
}
