# Dhun desktop preview

A desktop companion for Windows 10+ x64 and macOS 12+ (separate Apple Silicon and Intel installers). This is an independent Electron interface with a bundled, checksummed yt-dlp playback engine. It is not an Android emulator or a complete port of the Android application.

Included: YouTube search and audio streaming, a play queue, shuffle and repeat, favourites, listening history, local audio import, seek and volume controls, media keys, a waveform launch reveal, and persistent Monochrome / Indigo / Forest palettes with Dark / Light / System appearance. Reduced motion follows the operating system and the app preference.

Not included yet: YouTube account sign-in, Android library migration or sync, offline YouTube downloads, lyrics, Automix, and automatic installation of updates. Streaming depends on YouTube's availability and extraction compatibility. The first play of each online song buffers its audio before playback, so it can take a moment; up to ten tracks (64 MB each) are temporarily cached and removed on normal exit. Local files work without a connection. Play only content you have permission to access.

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

The first previews are unsigned and are not notarized. Windows or macOS may show a security warning or block launch. Production signing requires the owner's developer certificates. Desktop updates are manual through Settings → Downloads, updates & source; installing a new version preserves the app's profile.

## Source and licences

Dhun source: https://github.com/jaitak2121-spec/dhun-music (private during development).

The desktop code is GPL-3.0-only. Electron's bundled third-party notices accompany its distribution. yt-dlp's PyInstaller executables include GPLv3+ components; their exact licences are bundled under `licenses/`. The exact engine source and dependency notices are available at https://github.com/yt-dlp/yt-dlp/tree/2026.10.26 and https://github.com/yt-dlp/yt-dlp/releases/tag/2026.10.26. Dhun's Android provenance is recorded in the root `NOTICE.md`.

Renderer code uses the Chromium version bundled with the pinned Electron release. Network content never receives Node access; renderer sandboxing, context isolation, CSP, constrained IPC, and a custom app/file protocol remain enabled.
