# Dhun

A personal Android music experience. Your music. Your rhythm.

![Dhun icon](assets/brand/dhun-icon.png)

## Development

- Kotlin, Jetpack Compose, Media3, and native audio analysis.
- JDK 17, Android SDK 37 and the configured Android NDK/CMake toolchain required.
- Debug build: `./gradlew assembleDevDebug`
- Unit tests: `./gradlew testDevDebugUnitTest`
- Application ID and Kotlin namespace: `io.github.jaitak2121spec.dhun`.

## Test builds

The **Dhun Android Check** workflow builds the development APK and runs unit tests on pushes and pull requests to `main`. A manual run is available from Actions. Download `dhun-debug` from the run's artifacts to install the universal debug APK. Artifacts expire after three days. This workflow does not publish releases or use production signing keys.

## Appearance

- Black and white by default, with optional Indigo and Forest palettes.
- Independent light, dark and system appearance modes.
- Approved earbud-and-waveform mark, rendered as a scalable Android icon.
- Platform sans-serif typography and a Dhun home header.
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
