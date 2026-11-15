# Dhun

A personal Android music experience. Your music. Your rhythm.

![Dhun icon](assets/brand/dhun-icon.png)

## Download

[**Download Dhun for Android — debug APK (ZIP)**](https://github.com/jaitak2121-spec/dhun-music/actions/runs/43713526424/artifacts/14161995195)

Extract the ZIP and install the APK on an Android 8.0 or newer ARM phone. This is a development build; not every inherited feature has been verified on a device.

Sign in to GitHub with access to this private repository to download. This artifact expires three days after the build. For newer builds, open [Dhun Android Check](https://github.com/jaitak2121-spec/dhun-music/actions/workflows/android-check.yml), select a successful run, and download its `dhun-debug` artifact.

## Development

- Kotlin, Jetpack Compose, Media3, and native audio analysis.
- JDK 17, Android SDK 37 and the configured Android NDK/CMake toolchain required.
- Debug build: `./gradlew assembleDevDebug`
- Unit tests: `./gradlew testDevDebugUnitTest`
- Application ID and Kotlin namespace: `io.github.jaitak2121spec.dhun`.

## Test builds

The **Dhun Android Check** workflow builds the development APK and runs unit tests on pushes and pull requests to `main`. A manual run is available from Actions. Download `dhun-debug` from the run's artifacts to install the universal debug APK. Artifacts expire after three days. This workflow does not publish releases or use production signing keys.

The Genius live-service test is opt-in because it depends on an external website. Run it with `DHUN_LIVE_TESTS=1 ./gradlew --no-daemon testDevDebugUnitTest --tests '*GeniusTest' --rerun-tasks`. Its fixture-based parsing tests run in the normal suite.

## Appearance

- Black and white by default, with optional Indigo and Forest palettes.
- Independent light, dark and system appearance modes.
- Approved earbud-and-waveform mark, rendered as a scalable Android icon.
- Platform sans-serif typography and a Dhun home header.
- Brief logo-and-ripple launch reveal, home-feed fades, animated play/pause icons and sliding settings selectors. New motion respects Reduce animation and the Android animator setting.
- Theme choices persist across restarts and participate in settings backups.

## Development status

- Upstream publishing/deployment workflows are archived in `docs/upstream-workflows/`; they do not run in Dhun.
- Update checks point to Dhun's repository. A private repository will not return releases to anonymous clients.
- Playback and source functionality remain inherited. This development fork is not a Play Store release.
- Upstream signing material is retained for provenance only. Never use it to sign Dhun.
- Third-party service domains, login integrations and distribution configuration require review before release.
- Android compilation and device verification are required before shipping these changes.

## License

See [LICENSE](LICENSE) and [third-party credits and source provenance](NOTICE.md). Existing copyright and license headers remain in their source files.
