# Dhun for iPhone

Native SwiftUI iPhone/iPad development preview, iOS 17+. Uses the existing Dhun identity, branding and consent-based account activity service. Source is GPL-3.0; YouTubeKit is MIT and pinned to an exact source revision. No remote extraction proxy is enabled.

## Included

- Search and taste-based discovery; local stream extraction and AVPlayer audio playback.
- Background audio, headphone-disconnect pause, lock-screen controls, seek, play next / queue swipes and related-song queue filling.
- Favourites, recent plays, persistent local playlists, public YouTube/YouTube Music playlist preview/import, and conservative matching of public Spotify previews.
- Audio import from Files; audio-only downloads for offline playback; synced/plain LRCLIB lyrics when available.
- Monochrome, Indigo and Forest themes; native Reduce Motion behavior.
- Optional Google sign-in using ASWebAuthenticationSession and a one-use, phone-bound browser grant. Session tokens use this-device-only Keychain storage. Playlists and listening history remain local.
- Explicitly optional account activity reporting (UTC date, platform, version), with the same existing owner dashboard.

This is a separate iOS implementation, not all Android features ported. No Android Auto, Android audio analyzer/EQ, desktop updater, cloud playlist sync, community feature or Siri integration is included. Spotify import matches up to 20 public-preview tracks and skips uncertain matches; YouTube imports the first public page, up to 100 tracks. Imports always show a review before saving. Source changes can break catalogue lookup/extraction. DRM, private/paid or restricted recordings are not supported. Live playback on a physical iPhone still needs verification; simulator playback checks use a bundled test-only silent audio fixture, not a claim that YouTube extraction succeeds on every network.

## Build

Install full Xcode (Command Line Tools alone cannot build an iOS app) and XcodeGen:

```sh
brew install xcodegen
cd ios
swift test
xcodegen generate
open Dhun.xcodeproj
```

Select the Dhun scheme and an iPhone simulator to run. For a physical iPhone, select your own signing team in Xcode and set a unique bundle identifier if necessary. The public cloud callback scheme stays `dhun-ios`. Never commit signing certificates, credentials or provisioning profiles.

The **Dhun iPhone** GitHub workflow compiles an unsigned device build, runs core tests and real simulator UI/audio tests, and attaches Home, Library and Player screenshots. Its development ZIP is not an installable signed iPhone download. It expires after 14 days as a build artifact; it is deliberately excluded from the public site's installers until signing and distribution are set up.

A free Apple Personal Team can install development builds on your own registered phone with short-lived provisioning. TestFlight and normal release distribution require the appropriate Apple Developer membership and signing/review. Do not promise that this source's YouTube extraction will pass App Review.

## Backend rollout

Apply the additive `cloud/schema.sql`, deploy the updated cloud service, and run `cloud/scripts/check-device-connection.mjs` with its documented disposable-test flag. Old Android/desktop connections stay compatible. The cloud service accepts the `ios` activity platform and binds the iPhone return scheme to server-held connection metadata, not an arbitrary return URL.

No anonymous iOS installation reporting is enabled in this first preview. Existing account activity remains off unless the user explicitly enabled it. Account export/deletion is available through the existing privacy/account portal.
