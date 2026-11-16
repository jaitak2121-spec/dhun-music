package io.github.jaitak2121spec.dhun.data

import android.content.Context
import io.github.jaitak2121spec.dhun.BuildConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.security.SecureRandom
import java.util.concurrent.TimeUnit

internal fun usageDue(enabled: Boolean, lastDay: Long, now: Long): Boolean =
    enabled && lastDay != now / 86_400_000L

/** Off until explicitly enabled. Independent of accounts and listening history. */
object UsageAnalytics {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val lock = Mutex()
    private val http = OkHttpClient.Builder().callTimeout(4, TimeUnit.SECONDS)
        .followRedirects(false).followSslRedirects(false).build()
    private fun prefs(context: Context) = context.applicationContext.getSharedPreferences("dhun_usage", Context.MODE_PRIVATE)
    fun enabled(context: Context) = prefs(context).getBoolean("enabled", false)
    fun setEnabled(context: Context, value: Boolean) {
        // Disable synchronously before any queued job can send another signal.
        prefs(context).edit().putBoolean("enabled", value).putBoolean("erase", !value).apply()
        foreground(context)
    }
    fun foreground(context: Context) {
        val app = context.applicationContext
        scope.launch {
            lock.withLock {
                val prefs = prefs(app)
                try {
                    var secret = prefs.getString("installation", null)
                    if (prefs.getBoolean("erase", false)) {
                        if (secret != null) send("activity-erase", JSONObject().put("installation", secret))
                        prefs.edit().remove("installation").remove("day").remove("erase").commit()
                        secret = null
                    }
                    val now = System.currentTimeMillis()
                    if (!usageDue(enabled(app), prefs.getLong("day", -1), now)) return@withLock
                    val day = now / 86_400_000L
                    if (secret == null) {
                        secret = ByteArray(32).also { SecureRandom().nextBytes(it) }.joinToString("") { "%02x".format(it) }
                        check(prefs.edit().putString("installation", secret).commit())
                    }
                    send("activity", JSONObject().put("installation", secret).put("platform", "android").put("version", BuildConfig.VERSION_NAME))
                    prefs.edit().putLong("day", day).commit()
                } catch (_: Exception) { /* Best effort; never block playback. Retry at next foreground. */ }
            }
        }
    }
    private fun send(action: String, body: JSONObject) {
        val request = Request.Builder().url("https://dhun-cloud.vercel.app/api/cloud/$action")
            .post(body.toString().toRequestBody("application/json".toMediaType())).build()
        http.newCall(request).execute().use { check(it.isSuccessful) }
    }
}
