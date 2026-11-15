# Dhun design system

Owner direction: black and white is the default. Indigo remains an optional theme. The owner approved the earbud-and-waveform logo reference and requested implementation on November 15, 2026.

## Appearance

Settings → Appearance has independent light/dark/system mode and colour palette controls. Mono is the default; Indigo and Forest are optional. The existing preference store persists both choices and includes them in its settings backup. Unknown palette names fall back to Mono.

Mono uses neutral grey surfaces and platform sans-serif typography. Indigo uses navy #111B35 and periwinkle #A5B4FC in dark mode, with a stronger blue accent in light mode. Forest uses deep green #0E2420 and sage #B9CBB1 in dark mode, with cream and deep green in light mode. Artwork and artwork-derived player backgrounds retain their original colours.

## Logo

- Approved reference reconstruction: `assets/brand/dhun-monochrome-logo-v1.png`.
- Scalable icon: `assets/brand/dhun-icon.svg`.
- Export: `assets/brand/dhun-icon.png` (1024 × 1024).
- Android vector: `app/src/main/res/drawable/ic_dhun_mark.xml`.
- Android adaptive launcher: `app/src/main/res/mipmap-anydpi/dhun_launcher.xml`.

The vector is a simplified hand-drawn implementation of the approved mark, not an automatic trace. The launcher supports standard masks and Android's monochrome themed-icon layer. The home header uses the same mark, tinted to the active foreground colour.

## Verification remaining

Build and device verification require JDK 17 and Android SDK/NDK. Review launcher masks, home layout, theme persistence, large font sizes and all three palettes in light/dark modes on a device before release.
