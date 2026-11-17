package io.github.jaitak2121spec.dhun.data

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import io.github.jaitak2121spec.dhun.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.intOrNull
import okhttp3.Request
import java.io.File
import java.security.MessageDigest

/**
 * Dhun checks the published Android build manifest once per launch. Update
 * notices are optional; dismissing them never blocks listening. Version codes
 * identify preview builds, independent of rolling release tags or desktop versions.
 *
 * The update itself is also handled here: the release's `.apk` asset is
 * downloaded into the app's cache and handed to the system package installer,
 * so the whole round trip stays inside the app instead of bouncing out to a
 * browser.
 */
object AppUpdateChecker {

    data class UpdateInfo(
        val version: String,
        val releaseUrl: String,
        val apkUrl: String?,
        /** The release's own Markdown body, shown as this update's "what's new". */
        val notes: String?,
        val sha256: String,
    )

    private const val CACHE_SUBDIR = "updates"

    private const val DOWNLOAD_ROOT = "https://github.com/jaitak2121-spec/dhun-music/releases/download/preview"
    private const val LATEST_RELEASE_URL = "$DOWNLOAD_ROOT/Android-build.json"

    private val json = Json { ignoreUnknownKeys = true }

    private val _available = MutableStateFlow<UpdateInfo?>(null)
    val available = _available.asStateFlow()

    /** Where this update's APK download currently stands, for the dialog's progress row. */
    sealed interface DownloadState {
        data object Idle : DownloadState
        data class Downloading(val fraction: Float) : DownloadState
        data class Ready(val file: File) : DownloadState
        data class Failed(val message: String) : DownloadState
    }

    private val _download = MutableStateFlow<DownloadState>(DownloadState.Idle)
    val download = _download.asStateFlow()

    /** Set from the UI thread when the user cancels; polled between network reads. */
    @Volatile
    private var downloadCancelled = false

    suspend fun check() = withContext(Dispatchers.IO) {
        runCatching {
            val request = Request.Builder().url("$LATEST_RELEASE_URL?check=${System.currentTimeMillis()}").header("Cache-Control", "no-cache").build()
            val body = Http.client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) null else response.body?.string()
            } ?: return@runCatching
            _available.value = parseManifest(body, BuildConfig.VERSION_CODE)
        }
    }

    /**
     * Wipes any APK left over from a previous run. Called once at cold start
     * so a downloaded update is only ever "Install Now" for the session that
     * downloaded it — the next launch starts clean rather than trying to work
     * out whether a leftover file is still good.
     */
    suspend fun clearCache(context: Context) = withContext(Dispatchers.IO) {
        File(context.cacheDir, CACHE_SUBDIR).listFiles()?.forEach { it.delete() }
    }

    internal fun parseManifest(body: String, currentCode: Int): UpdateInfo? = runCatching {
        if (body.length > 100_000) return@runCatching null
        val metadata = json.parseToJsonElement(body) as? JsonObject ?: return@runCatching null
        val code = metadata["versionCode"]?.jsonPrimitive?.intOrNull ?: return@runCatching null
        val version = metadata["versionName"]?.jsonPrimitive?.contentOrNull ?: return@runCatching null
        val digest = metadata["sha256"]?.jsonPrimitive?.contentOrNull?.lowercase() ?: return@runCatching null
        if (code <= currentCode || !Regex("[A-Za-z0-9._+-]{1,64}").matches(version) || !Regex("[a-f0-9]{64}").matches(digest)) return@runCatching null
        // Versioned assets are never replaced by the next rolling preview.
        val preview = Regex("^1\\.7\\.1-preview\\.([1-9][0-9]*)$").matchEntire(version)?.groupValues?.get(1)
            ?: return@runCatching null
        if (preview.toIntOrNull()?.let { it + 1000 == code } != true) return@runCatching null
        val versionRoot = "https://github.com/jaitak2121-spec/dhun-music/releases/download/preview-$preview"
        UpdateInfo(version, "https://dhun-cloud.vercel.app/download", "$versionRoot/Dhun.apk", metadata["notes"]?.jsonPrimitive?.contentOrNull, digest)
    }.getOrNull()

    /**
     * Streams the current update's APK into the app cache, reporting progress
     * through [download]. A finished file survives a cancelled dialog: until
     * the state is reset, "Install Now" comes straight back without a second
     * download.
     */
    suspend fun downloadApk(context: Context): Unit = withContext(Dispatchers.IO) {
        // A dialog may have remained open across several new releases. Refresh first.
        check()
        val info = _available.value ?: return@withContext
        val url = info.apkUrl ?: return@withContext
        downloadCancelled = false
        _download.value = DownloadState.Downloading(0f)

        runCatching {
            val dir = File(context.cacheDir, CACHE_SUBDIR).apply { mkdirs() }
            // Drop anything left over from an earlier attempt.
            dir.listFiles()?.forEach { it.delete() }
            val target = File(dir, "Dhun-update.apk")
            val digest = MessageDigest.getInstance("SHA-256")

            val request = Request.Builder().url(url).header("Cache-Control", "no-cache").build()
            Http.client.newCall(request).execute().use { response ->
                check(response.isSuccessful) { "Download failed: HTTP ${response.code}" }
                val body = response.body ?: error("Empty download body")
                val total = body.contentLength().takeIf { it > 0 }

                body.byteStream().use { input ->
                    target.outputStream().use { output ->
                        val buffer = ByteArray(64 * 1024)
                        var readTotal = 0L
                        while (true) {
                            if (downloadCancelled) {
                                _download.value = DownloadState.Idle
                                return@withContext
                            }
                            val read = input.read(buffer)
                            if (read == -1) break
                            check(readTotal + read <= 200L * 1024 * 1024) { "Update download exceeds the allowed size" }
                            digest.update(buffer, 0, read)
                            output.write(buffer, 0, read)
                            readTotal += read
                            total?.let {
                                _download.value =
                                    DownloadState.Downloading((readTotal.toFloat() / it).coerceIn(0f, 1f))
                            }
                        }
                    }
                }
            }
            val actualDigest = digest.digest().joinToString("") { "%02x".format(it) }
            check(actualDigest == info.sha256) {
                target.delete()
                "Update verification failed. Please download again."
            }
            _download.value = DownloadState.Ready(target)
        }.onFailure { error ->
            _download.value = if (downloadCancelled) {
                DownloadState.Idle
            } else {
                DownloadState.Failed(error.message ?: "Download failed")
            }
        }
    }

    /** Stops an in-flight download; the next read loop sees this and bails. */
    fun cancelDownload() {
        downloadCancelled = true
    }

    /** Back to square one after a failure, so the dialog offers Download again. */
    fun resetDownload() {
        _download.value = DownloadState.Idle
    }

    /**
     * Hands a downloaded APK to the system installer.
     *
     * Sideloaded apps need the user's blessing per app ("install unknown apps");
     * without it the installer intent silently does nothing on most ROMs, so
     * the user is sent to that one switch first and taps Install again after.
     */
    fun installApk(context: Context, file: File) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            !context.packageManager.canRequestPackageInstalls()
        ) {
            context.startActivity(
                Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                    .setData(Uri.parse("package:${context.packageName}"))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
            return
        }
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        context.startActivity(
            Intent(Intent.ACTION_INSTALL_PACKAGE)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true)
                .putExtra(Intent.EXTRA_RETURN_RESULT, true)
                .addFlags(
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or
                        Intent.FLAG_ACTIVITY_NEW_TASK,
                ),
        )
    }

}
