# Dhun preview signing

`dhun-debug.jks` is an intentionally non-secret, development-only identity. Its alias is `androiddebugkey`; store and key passwords are both `android`. The Gradle debug configuration uses it so previews from different CI runs have the same certificate and can install as updates.

Never use this key for production, store publishing, or security-sensitive integrations. Production signing must use a separate private key.

Previews built before this key was introduced used automatically generated runner keys. Android may require removing an older preview once before installing this version. Export settings and preserve downloads before uninstalling; uninstalling can erase app-private data. Future previews built with this development identity should install as updates.
