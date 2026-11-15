# Dhun

A personal Android music experience. Branding and interface development in progress.

Derived from [DollBloom](https://github.com/DominatorStufs/DollBloom), itself derived from BitChord. Original source, copyright notices and license headers are retained. See [LICENSE](LICENSE) and [upstream documentation](docs/UPSTREAM_README.md).

## Development

- Kotlin, Jetpack Compose, Media3, and the existing DollBloom playback engine.
- JDK 17, Android SDK 37 and the configured Android NDK/CMake toolchain required.
- Debug build: `./gradlew assembleDevDebug`
- Unit tests: `./gradlew testDevDebugUnitTest`
- Application ID: `io.github.jaitak2121spec.dhun`; internal Kotlin namespace remains unchanged to keep the initial fork small.

## Identity review

The logo and visual direction require owner approval before integration. Two concepts are being explored: violet/coral with a wave mark, and cream/deep green with a monogram. Existing icons are inherited placeholders, not approved Dhun artwork.

## Fork status

- Initial base: DollBloom `49381fcfd49fb739046584460fbf8c57b0c732d1`.
- Upstream publishing/deployment workflows are archived in `docs/upstream-workflows/`; they do not run in Dhun.
- Update checks point to Dhun's repository. A private repository will not return releases to anonymous clients.
- Playback and source functionality remain inherited. This development fork is not a Play Store release.
- Upstream signing material is retained for provenance only. Never use it to sign Dhun.
- Third-party service domains, login integrations, fonts, translations and remaining display strings require review before release.

## License

GPLv3, with retained third-party license notices, including AGPL notices in the Automix implementation. Modifications for Dhun begin with the commits following the upstream base.
