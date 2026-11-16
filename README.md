# Dhun

A personal music experience for Android, Windows and macOS. Your music. Your rhythm.

![Dhun icon](assets/brand/dhun-icon.png)

## Download

**[Get Dhun — download for Android, Windows and Mac](https://dhun-cloud.vercel.app/download)**

| Device | Direct installer |
| --- | --- |
| Android 8+ ARM | [Download APK](https://github.com/jaitak2121-spec/dhun-music/releases/download/preview/Dhun.apk) |
| Windows 10+ x64 | [Download EXE](https://github.com/jaitak2121-spec/dhun-music/releases/download/preview/Dhun-Windows-x64.exe) |
| Mac with Apple Silicon, macOS 12+ | [Download DMG](https://github.com/jaitak2121-spec/dhun-music/releases/download/preview/Dhun-Mac-arm64.dmg) |
| Mac with Intel, macOS 12+ | [Download DMG](https://github.com/jaitak2121-spec/dhun-music/releases/download/preview/Dhun-Mac-x64.dmg) |

Install the APK on an Android 8.0 or newer ARM phone. This is a development build; not every inherited feature has been verified on a device.

These public, direct GitHub Release assets need **no GitHub sign-in, no ZIP extraction, and have no three-day expiry**. The links stay the same when successful builds replace the current preview. Assets remain available until removed; GitHub hosting is still required. [Older versions and build source revisions](https://github.com/jaitak2121-spec/dhun-music/releases) remain available in Releases. `Android-build.json` and `Desktop-build.json` identify the exact source revisions and app versions for the rolling downloads.

Desktop installers are unsigned development previews, so Windows or macOS may warn or block launch. See [desktop features, limitations and build instructions](desktop/README.md). Desktop includes search, playback, local music, queue, lyrics, favourites and themes; it does not yet have all Android features. Optional update notices offer a download or “Later”; desktop installation remains manual. Android verifies the downloaded update's SHA-256 before opening the system installer for confirmation.

Current previews use a consistent, development-only signing identity. If Android refuses to update an older preview, back up your settings and downloads before uninstalling it once. See [preview signing](signing/DHUN_DEVELOPMENT.md). Future previews with this identity can install as updates.

## Optional Dhun Cloud

New previews include an optional account connection under Settings → Dhun Cloud. Users sign in through the browser, verify their email, review the privacy notice and explicitly approve their device. Connecting never starts an automatic upload.

Desktop can manually back up online favourites and appearance settings, and merge a restored backup while keeping local music. Android can upload and restore appearance settings while preserving favourites already in the cloud; it does not upload or modify YouTube likes. Listening history, Google credentials, YouTube cookies, audio files and local file paths are excluded. Device access is encrypted locally and expires after 30 days.

The account portal provides data export, backup erasure and password-confirmed account deletion. The private owner dashboard shows opted-in accounts and backup counts. [Backend setup and preview limitations](cloud/README.md) document security, testing and the production email-delivery work remaining. Older installations must install the new preview to get these controls; they do not start sending data remotely.

## Development

- Kotlin, Jetpack Compose, Media3, and native audio analysis.
- JDK 17, Android SDK 37 and the configured Android NDK/CMake toolchain required.
- Debug build: `./gradlew assembleDevDebug`
- Unit tests: `./gradlew testDevDebugUnitTest`
- Application ID and Kotlin namespace: `io.github.jaitak2121spec.dhun`.

## Test builds

The **Dhun Android Check** workflow builds the development APK and runs unit tests on pushes and pull requests to `main`. Successful main-branch builds publish a prerelease with a direct `Dhun.apk` asset and a monotonically increasing Android version code. A manual run is available from Actions. The separate ZIP artifacts expire after three days; prerelease assets do not. Production signing keys are not used.

The Genius live-service test is opt-in because it depends on an external website. Run it with `DHUN_LIVE_TESTS=1 ./gradlew --no-daemon testDevDebugUnitTest --tests '*GeniusTest' --rerun-tasks`. Its fixture-based parsing tests run in the normal suite.

## Appearance

- Black and white by default, with optional Indigo and Forest palettes.
- Independent light, dark and system appearance modes.
- Approved earbud-and-waveform mark, rendered as a scalable Android icon.
- Platform sans-serif typography and a Dhun home header.
- Waveform draw-on, earbud logo reveal, staggered wordmark/tagline and a soft zoom-out opening transition. Home-feed fades, animated play/pause icons and sliding settings selectors respect Reduce animation and the Android animator setting. Desktop has a matching opening sequence and respects the operating system's reduced-motion setting.
- Theme choices persist across restarts and participate in settings backups.
- Guest discovery uses native mood cards with music searches, rather than generic regional video charts. Sign in for account-based recommendations; regional music remains available in Search and Explore.
- Desktop favourites have filled hearts, saved counts, filtering and undo, with state shared across the player and song lists and saved on this device.
- Home discovery can be tuned with music language, up to three artists, and genres or mood. Android builds a taste-based shelf from music search and related-song radio, including for guests; signed-in feeds keep Recents and explicit taste ahead of generic supplements. Duplicate cards are removed. Discovery interleaves seeds, caps each artist's share, and excludes known Android dislikes. Desktop provides taste-based search discovery and a local “Not interested” control. Preferences guide results rather than guaranteeing a strict language filter; source availability still applies. Preferences and hidden suggestions remain on the device; discovery requests go to the music source and are not uploaded to Dhun Cloud.
- Desktop lyrics use LRCLIB, with line highlighting, click-to-seek, plain-text fallback and manual title/artist matching. Local songs can use a matching `.lrc` file. Availability depends on the recording and source; lyrics are not guaranteed for every song.

## Development status

- Predictive search offers related queries while typing, with local recent searches before typing, an exact-query fallback when suggestions are unavailable, and stale-response protection. Desktop supports arrow-key selection, Enter, Escape, IME composition and clearable local query history. Android keeps its live song/artist previews alongside up to six related completions. Live prefixes go to the suggestion source; query history is stored locally and is not uploaded to Dhun Cloud.

- Upstream publishing/deployment workflows are archived in `docs/upstream-workflows/`; they do not run in Dhun.
- Optional update checks read the public Dhun build manifests. Dismissing an update never blocks playback. Already-installed previews without this updater need one manual update first.
- Android playback and source functionality remain inherited. This development fork is not a Play Store release.
- Upstream signing material is retained for provenance only. Never use it to sign Dhun.
- Third-party service domains, login integrations and distribution configuration require review before release.
- Android compilation and device verification are required before shipping these changes.

## License

See [LICENSE](LICENSE) and [third-party credits and source provenance](NOTICE.md). Existing copyright and license headers remain in their source files.
