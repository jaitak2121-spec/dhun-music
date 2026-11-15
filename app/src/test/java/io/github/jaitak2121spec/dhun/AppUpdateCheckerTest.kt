package io.github.jaitak2121spec.dhun

import io.github.jaitak2121spec.dhun.data.AppUpdateChecker
import org.junit.Assert.*
import org.junit.Test

class AppUpdateCheckerTest {
    @Test fun previewManifestUsesVersionCodesAndTrustedDownloads() {
        val digest = "a".repeat(64)
        val body = """{"versionCode":1006,"versionName":"1.7.1-preview.6","sha256":"$digest","url":"https://untrusted.example/app.apk"}"""
        val update = AppUpdateChecker.parseManifest(body, 1005)
        assertNotNull(update)
        assertEquals("https://github.com/jaitak2121-spec/dhun-music/releases/download/preview/Dhun.apk", update?.apkUrl)
        assertEquals(digest, update?.sha256)
        assertNull(AppUpdateChecker.parseManifest(body, 1006))
        assertNull(AppUpdateChecker.parseManifest(body, 1007))
        assertNull(AppUpdateChecker.parseManifest(body.replace(digest, "invalid"), 1005))
        assertNull(AppUpdateChecker.parseManifest("{}", 1))
        assertNull(AppUpdateChecker.parseManifest("not json", 1))
    }
}
