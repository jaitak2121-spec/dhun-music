# Dhun desktop preview

A desktop companion for Windows 10+ x64 and macOS 12+ (separate Apple Silicon and Intel installers). This is an independent Electron interface with a bundled, checksummed yt-dlp playback engine. It is not an Android emulator or a complete port of the Android application.

Included: YouTube search and audio streaming, a play queue, shuffle and repeat, favourites with filled hearts/counts/filtering/undo, listening history, local audio import, seek and volume controls, media keys, a waveform launch reveal, optional update notices, and persistent Monochrome / Indigo / Forest palettes with Dark / Light / System appearance. Reduced motion follows the operating system and the app preference.

Discover → Choose your music taste accepts language, up to three artists, and genres/mood. Results interleave the selected artists, remove duplicate uploads and limit each artist to three suggestions. “Not interested” hides a song on this device; Reset clears preferences and hidden suggestions. Queries go to the music source; these preferences and dismissals are not uploaded to Dhun Cloud. No account is required. Source errors show a retryable message, and changing preferences discards stale results. This feature recommends songs; desktop does not automatically extend the playback queue.

Search suggests related queries before pressing Enter. Focus the empty field for recent searches, type for live completions, and use Arrow Up/Down then Enter or click a suggestion. Escape dismisses the list. Recent queries stay on this device and can be cleared; typed prefixes go to Google's YouTube suggestion service. A short debounce, bounded cache, four-second source timeout and local fallback keep search usable if that service changes or is unavailable. Search history is excluded from Dhun Cloud backups.

Dhun Cloud is separately optional under Make it yours. Browser sign-in and explicit device approval enable manual backup of online favourites and appearance settings. Restore merges favourites and keeps local music. Cloud tokens are encrypted using operating system secure storage; no plaintext fallback is used. Listening history, audio files and local file paths are excluded. Privacy, export, erasure and account deletion are available in the account portal. Connecting does not sign in to YouTube or enable automatic uploads. Android currently backs up appearance only and preserves existing cloud favourites.

Lyrics: open the lyrics button beside the queue control. Online songs query LRCLIB; synchronised results highlight the current line and let you seek by selecting it. Plain lyrics are shown when timing isn't available. Use “Follow song” to control automatic scrolling, or search by title/artist if matching fails. Local songs first read a `.lrc` beside the audio file with the same filename stem; online lookup for a local song requires an explicit search. Lyrics are not guaranteed for every recording. Online lookup sends the title, artist and duration to LRCLIB; results are cached during the session and requests respect the provider's rate limits.

Not included yet: YouTube account sign-in, Android library migration or sync, offline YouTube downloads, Automix, and automatic installation of updates. Streaming depends on YouTube's availability and extraction compatibility. The first play of each online song buffers its audio before playback, so it can take a moment; up to ten tracks (64 MB each) are temporarily cached and removed on normal exit. Local files work without a connection. Play only content you have permission to access.

## Build and run

On Windows or macOS, install Node 24+ and run from this directory:

```sh
npm ci
npm run prepare:player
npm test
npm start
npm run smoke
npm run dist
```

`prepare:player` downloads yt-dlp **2026.10.26** and verifies a pinned SHA-256 checksum. Electron supplies the JavaScript runtime used by its bundled challenge solver; users do not need Node, Python, Java, or FFmpeg for normal playback. Installer icons are generated from Dhun's approved vector mark and committed in `resources/`.

The CI matrix produces a Windows NSIS `.exe` and macOS `.dmg` installers for arm64 and x64. Each runner performs a GUI/audio smoke test before packaging; the Windows installer also runs a silent install and the installed application is smoke-tested. Mac tests open the packaged `.app` on the matching architecture.

The first previews are unsigned and are not notarized. Windows or macOS may show a security warning or block launch. Production signing requires the owner's developer certificates. On launch, Dhun checks its public desktop version manifest and offers an optional “Download update” / “Later” notice. Settings → Check for updates checks manually. Downloading opens the correct Windows, Apple Silicon Mac or Intel Mac installer; installing it is manual and preserves the app's profile. No playback gate or silent installation is used. Bump `package.json` when publishing a new desktop app version; rebuilding the same version does not prompt an update.

## Source and licences

Dhun source: https://github.com/jaitak2121-spec/dhun-music (public).

The desktop code is GPL-3.0-only. Electron's bundled third-party notices accompany its distribution. yt-dlp's PyInstaller executables include GPLv3+ components; their exact licences are bundled under `licenses/`. The exact engine source and dependency notices are available at https://github.com/yt-dlp/yt-dlp/tree/2026.10.26 and https://github.com/yt-dlp/yt-dlp/releases/tag/2026.10.26. Dhun's Android provenance is recorded in the root `NOTICE.md`.

Renderer code uses the Chromium version bundled with the pinned Electron release. Network content never receives Node access; renderer sandboxing, context isolation, CSP, constrained IPC, and a custom app/file protocol remain enabled.
