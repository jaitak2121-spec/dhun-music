package io.github.jaitak2121spec.dhun.data.cloud

import android.content.Context
import android.content.Intent
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.security.KeyStore
import java.util.concurrent.TimeUnit
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Dhun identity is separate from optional YouTube sessions. No plaintext token fallback. */
class CloudAccounts(context: Context) {
    companion object {
        val connectionState = kotlinx.coroutines.flow.MutableStateFlow(false)
        val accountReturns = kotlinx.coroutines.flow.MutableStateFlow(0)
        fun consumeReturn(intent: Intent) {
            // A return link only opens the account screen. The saved secret,
            // not anything in the URL, authorizes the pending connection.
            if (intent.action == Intent.ACTION_VIEW && intent.dataString == "dhun://account/return") {
                accountReturns.value += 1
            }
        }
        const val URL = "https://dhun-cloud.vercel.app"
        private const val ALIAS = "dhun_cloud_session"
        private val http = OkHttpClient.Builder().followRedirects(false).followSslRedirects(false)
            .callTimeout(30, TimeUnit.SECONDS).build()
    }
    private val prefs = context.applicationContext.getSharedPreferences("dhun_cloud_session", Context.MODE_PRIVATE)
    init { connectionState.value = connected }
    val connected: Boolean get() = prefs.contains("session")
    val pending: Boolean get() = prefs.contains("pending") && prefs.getLong("pendingExpires", 0) > System.currentTimeMillis()
    private fun key(create: Boolean): SecretKey = synchronized(CloudAccounts::class.java) {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(ALIAS, null) as? SecretKey) ?: run {
            check(create) { "Secure connection unavailable. Forget the connection and connect again." }
            KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
                init(KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
            }.generateKey()
        }
    }
    private fun readSecret(name: String): String {
        val stored = prefs.getString(name, null) ?: error("Start sign-in from Dhun again.")
        return try {
            val parts = stored.split(':')
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(false), GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)))
            String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8)
        } catch (_: Exception) { error("Secure connection could not be opened. Forget the connection and connect again.") }
    }
    private fun token(): String = readSecret("session")
    private fun saveSecret(name: String, value: String) {
        check(Regex("^[A-Za-z0-9_-]{43}$").matches(value)) { "Invalid cloud session." }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key(true))
        val encrypted = Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" + Base64.encodeToString(cipher.doFinal(value.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
        check(prefs.edit().putString(name, encrypted).commit()) { "Could not save the secure connection." }
    }
    private fun saveToken(value: String) {
        saveSecret("session", value)
        connectionState.value = true
    }
    private fun request(action: String, body: JSONObject? = null, authenticated: Boolean = true): JSONObject {
        val builder = Request.Builder().url("$URL/api/cloud/$action")
        if (authenticated) builder.header("Authorization", "Bearer ${token()}")
        if (body != null) builder.post(body.toString().toRequestBody("application/json".toMediaType()))
        http.newCall(builder.build()).execute().use { response ->
            val source = response.body?.source() ?: error("No response from Dhun Cloud.")
            check(!source.request(2_000_001)) { "Cloud response was too large." }
            val data = try { JSONObject(source.readUtf8()) } catch (_: Exception) { error("Dhun Cloud is temporarily unavailable.") }
            if (authenticated && response.code == 401) { prefs.edit().clear().commit(); connectionState.value = false }
            check(response.isSuccessful) { data.optString("error", "Cloud request failed.") }
            return data
        }
    }
    suspend fun start(): JSONObject = withContext(Dispatchers.IO) {
        check(!connected) { "Disconnect the existing account first." }
        key(true)
        val data = request("connect-start", JSONObject().put("name", "Dhun Android browser"), false)
        val code = data.getString("userCode")
        check(Regex("^[A-F0-9]{8}$").matches(code) && data.getString("verificationUrl") == "$URL/?connect=$code") { "Invalid connection response." }
        saveSecret("pending", data.getString("deviceCode"))
        check(prefs.edit().putLong("pendingExpires", System.currentTimeMillis() + 300_000).commit()) { "Could not save sign-in progress." }
        data
    }
    suspend fun poll(): Boolean = withContext(Dispatchers.IO) {
        check(pending) { "Sign-in expired. Start again from Dhun." }
        val data = request("connect-poll", JSONObject().put("deviceCode", readSecret("pending")), false)
        if (data.optBoolean("pending")) false else {
            saveToken(data.getString("token"))
            prefs.edit().remove("pending").remove("pendingExpires").commit()
            true
        }
    }
    suspend fun account(): JSONObject = withContext(Dispatchers.IO) { request("device-account").getJSONObject("account") }
    suspend fun backup(): JSONObject = withContext(Dispatchers.IO) { request("device-backup") }
    suspend fun upload(value: JSONObject): JSONObject = withContext(Dispatchers.IO) { request("device-backup", value) }
    suspend fun disconnect() = withContext(Dispatchers.IO) {
        request("device-disconnect", JSONObject())
        check(prefs.edit().clear().commit()) { "Could not clear the device connection." }
        connectionState.value = false
    }
    fun forget() { check(prefs.edit().clear().commit()) { "Could not clear the device connection." }; connectionState.value = false }
}
