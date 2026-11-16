package io.github.jaitak2121spec.dhun.data.cloud

import android.content.Context
import android.content.MutableContextWrapper
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import org.json.JSONObject

/** Google's account chooser appears over Dhun; no WebView, portal or browser. */
suspend fun nativeGoogleSignIn(context: Context, cloud: CloudAccounts, onStatus: (String) -> Unit): JSONObject {
    onStatus("Connecting securely to Dhun…")
    val challenge = cloud.startNativeGoogle()
    val option = GetSignInWithGoogleOption.Builder(challenge.getString("serverClientId"))
        .setNonce(challenge.getString("nonce"))
        .build()
    val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
    onStatus("Opening Google's account chooser…")
    val credential = CredentialManager.create(context).getCredential(context = MutableContextWrapper(context), request = request).credential
    check(credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
        "Google did not return a supported sign-in credential."
    }
    val google = GoogleIdTokenCredential.createFrom(credential.data)
    onStatus("Verifying your Google account with Dhun…")
    return cloud.completeNativeGoogle(challenge.getString("challenge"), google.idToken)
}
