# Dhun Cloud (early preview)

Opt-in account and backup service for Dhun. Uses the provisioned Neon managed authentication service and Postgres, hosted by Next.js on Vercel. No runtime mock database or fallback auth is included.

New desktop previews provide browser-approved device connections, manual online-favourite/appearance backup and merge restore. Android provides the same connection and manual appearance backup, preserving cloud favourites without uploading or modifying YouTube likes. Older installations do not connect or start collecting data until updated and explicitly approved by the user.

## Data and access

Accounts contain managed identity records (name, email and authentication metadata). Backups require a verified email and separate explicit consent. Allowed backup data is online favourites (video ID, song title, artist, duration) and appearance settings. Credentials, cookies, local paths, audio files and playback history are excluded.

User data transactions switch to a restricted Postgres role and enforce row level security with the verified session's user ID. Writes compare backup revisions to prevent stale overwrites. Browser mutations require same-origin requests and a browser-bound CSRF cookie/header. Native device approval codes expire after five minutes; secret redemption is one-time and device tokens expire after 30 days. Only SHA-256 token hashes are stored server-side. Device credentials cannot access owner endpoints. Erasing backups cascades to all device grants immediately. Desktop uses Electron safeStorage and refuses plaintext fallback; Android uses a separate Android Keystore AES-GCM key and excludes encrypted session storage from system backups.

Owner access is restricted to the verified email in the private server setting `DHUN_OWNER_EMAIL`. The first person to sign up never becomes the owner. The dashboard lists up to 200 opted-in accounts and backup counts, without exposing passwords. Users can export their backup, erase it, or delete their account after managed password reauthentication. The provider's `deleteUser` endpoint is disabled, so the service deletes the reauthenticated identity from its Postgres store; foreign keys cascade deletion to sessions, accounts and Dhun data.

The database is in Singapore. Raw IP addresses are not stored by Dhun; rate counters use a keyed hash and expire after ten minutes. Infrastructure providers may retain service logs and recovery backups under their policies. Do not log auth payloads, cookies, backup contents or database URLs.

## Development

Use Node 22 or newer. Link to the existing `dhun-cloud` Vercel project and pull its environment into ignored `.env.local`; do not provision another integration. The intended auth-enabled database has the `DHUN_` prefix. Unprefixed database variables point to an unused initial database and must not be used by the app.

Set the server-only settings shown in `.env.example`, using independent random 32-byte secrets. `DHUN_PUBLIC_URL` must exactly match the browser origin, without a trailing slash. Locally use `http://localhost:3000`, which Neon's development configuration permits. On Vercel, omit it to use the platform's canonical `VERCEL_PROJECT_PRODUCTION_URL`. Never expose owner email, secrets or database credentials through `NEXT_PUBLIC_` variables.

```
npm ci
npm run db:setup
npm test
npm run db:check
npm run build
npm run dev
```

`db:check` exercises real Postgres security inside a rolled-back transaction; it retains no test users. Run it against the configured account database only. Schema application is idempotent for the initial schema; future schema changes need explicit migrations.

## Before a public rollout

The provider's shared development email service is for preview testing. Configure and test a production sender, verify signup/email-code/reset/deletion flows, review the published privacy notice, and validate owner access. Public app APIs need application authentication even if Vercel deployment protection is disabled for production. Keep preview deployments protected. Do not claim that all previously installed apps send data or automatically gain cloud features.
