import styles from './download.module.css';

const repo = 'https://github.com/jaitak2121-spec/dhun-music';
const description = 'Your music. Your rhythm. Download Dhun music for Android, Windows and Mac. Explore music discovery, lyrics, themes and optional cloud backups.';

export const metadata = {
  title: 'Dhun — Your music. Your rhythm.',
  description,
  alternates: { canonical: 'https://dhun-cloud.vercel.app/download' },
  icons: { icon: '/logo.svg', apple: '/dhun-icon.png' },
  openGraph: {
    title: 'Dhun — Your music. Your rhythm.', description,
    url: 'https://dhun-cloud.vercel.app/download', type: 'website',
    images: [{ url: 'https://dhun-cloud.vercel.app/dhun-share.png', width: 1200, height: 630, alt: 'Dhun music for Android, Windows and Mac' }],
  },
  twitter: { card: 'summary_large_image', title: 'Dhun — Your music. Your rhythm.', description, images: ['https://dhun-cloud.vercel.app/dhun-share.png'] },
};

function Arrow() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/></svg>;
}

export default function Download() {
  return <div className={styles.site}>
    <a className={styles.skip} href="#download">Skip to downloads</a>
    <header className={styles.header}>
      <a className={styles.brand} href="/download"><img src="/logo.svg" width="42" height="42" alt=""/><span>Dhun</span></a>
      <nav aria-label="Primary"><a href="#inside">Inside Dhun</a><a href="#help">Help</a><a href="/">Dhun Cloud <span aria-hidden="true">↗</span></a></nav>
    </header>
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>A LITTLE LESS NOISE. A LOT MORE MUSIC.</p>
          <h1>Your music.<br/><span>Your rhythm.</span></h1>
          <p className={styles.lead}>Find your next favourite. Keep the songs you love close. Make every listen feel like you.</p>
          <a className={styles.primary} href="#download">Get Dhun <Arrow/></a>
          <p className={styles.availability}>ANDROID · WINDOWS · macOS</p>
        </div>
        <div className={styles.record}>
          <div className={styles.disc} aria-hidden="true"><div className={styles.label}><img src="/logo.svg" width="104" height="104" alt=""/><span>Dhun</span><small>YOUR MUSIC. YOUR RHYTHM.</small></div></div>
          <span className={styles.recordCaption} aria-hidden="true">MADE FOR YOUR EVERYDAY SOUNDTRACK</span>
        </div>
      </section>
      <ul className={styles.features} role="list"><li>Discovery that follows your taste</li><li>Lyrics when available</li><li>Favourites, queues & your own themes</li></ul>
      <section className={styles.showcase} id="inside">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>LESS FRICTION. MORE FEELING.</p><h2>A little look inside.</h2></div><p>The desktop preview, in action.</p></div>
        <figure className={styles.demo}><video controls playsInline preload="none" width="1320" height="880" poster="/screenshots/desktop-discover.jpg" aria-label="Dhun desktop walkthrough"><source src="/dhun-demo.mp4" type="video/mp4"/><track kind="captions" src="/dhun-demo.vtt" srcLang="en" label="English" default/></video><figcaption>A short, silent walkthrough: discover, fine-tune your taste and make Dhun yours. <a href="#demo-text">Read the walkthrough</a>.</figcaption></figure>
        <div className={styles.screenshots}>
          <figure><img src="/screenshots/desktop-discover.jpg" width="1320" height="880" loading="lazy" alt="Dhun desktop Discover screen with music taste controls"/><figcaption>Start with your taste. Explore music and refine your discoveries.</figcaption></figure>
          <figure><img src="/screenshots/desktop-settings.jpg" width="1320" height="880" loading="lazy" alt="Dhun desktop settings with theme, account and optional usage controls"/><figcaption>Make it yours. Themes, optional accounts and a clear privacy choice.</figcaption></figure>
        </div>
        <details id="demo-text"><summary>Walkthrough in words</summary><ol><li>Open Discover. Use the music taste controls to choose languages, artists and genres.</li><li>Search for a song, play it and manage your queue. Lyrics appear when a matching source is available.</li><li>Open Make it yours to change the theme. Account backup and anonymous usage sharing are separate, optional choices.</li></ol></details>
        <p className={styles.downloadNote}>Shown: the desktop preview. Android also includes device playlists and offline playback of saved tracks. Features vary by platform.</p>
      </section>
      <section className={styles.downloads}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>TAKE YOUR MUSIC WITH YOU</p><h2 id="download" tabIndex={-1}>Find your Dhun.</h2></div><p>Free preview.<br/>{' '}No account needed to download.</p></div>
        <div className={styles.platforms}>
          <article className={styles.platform}>
            <span className={styles.platformIndex}>01 / MOBILE</span><h3>Android</h3><p>Android 8.0+ · ARM phones</p>
            <a className={styles.installer} href="/api/download/android">Download APK <Arrow/></a>
            <small>Open the APK, allow installation from your browser when prompted, then install.</small>
          </article>
          <article className={styles.platform}>
            <span className={styles.platformIndex}>02 / DESKTOP</span><h3>Windows</h3><p>Windows 10+ · 64-bit</p>
            <a className={styles.installer} href="/api/download/windows">Download EXE <Arrow/></a>
            <small>Download and run the installer. Desktop previews are unsigned; Windows may show a warning.</small>
          </article>
          <article className={styles.platform}>
            <span className={styles.platformIndex}>03 / DESKTOP</span><h3>Mac</h3><p>macOS 12+ · Choose your chip</p>
            <div className={styles.macLinks}><a className={styles.installer} href="/api/download/mac-arm64">Apple Silicon · DMG <Arrow/></a><a className={styles.intel} href="/api/download/mac-x64">Intel Mac · DMG <span aria-hidden="true">↗</span></a></div>
            <small>Check Apple menu → About This Mac. These previews are unsigned and not notarized; macOS may block opening.</small>
          </article>
        </div>
        <p className={styles.downloadNote}>Direct installers, without ZIP extraction. These links always point to the latest published previews. Desktop features currently differ from Android.</p>
      </section>
      <section className={styles.help} id="help"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>A SMOOTH FIRST LISTEN</p><h2>Before you press play.</h2></div></div>
        <details><summary>How do I install Dhun on Android?</summary><p>Download the APK above. Open it from your browser’s downloads, permit installation from that browser if Android asks, and tap Install. Keep your existing Dhun installed when updating to preserve its local data. If Android reports a signature mismatch, stop and contact support before uninstalling.</p></details>
        <details><summary>Why might my browser or computer show a warning?</summary><p>Dhun is a preview distributed directly. Chrome may warn about APK files downloaded outside a store. Windows installers are unsigned; Mac previews are not Apple-notarized and may be blocked. A download warning alone is not a malware scan result, and we cannot promise warning-free installation. Download only through these official links. If your security software specifically detects a threat, stop and report the exact message.</p></details>
        <details><summary>Which Mac download should I choose?</summary><p>Open Apple menu → About This Mac. Choose Apple Silicon if it lists an Apple M-series chip, or Intel if it lists an Intel processor. Open the DMG and drag Dhun to Applications. If macOS blocks it, check System Settings → Privacy &amp; Security for the reason and any available Open Anyway option. Managed devices may prevent installation; contact support if it remains blocked.</p></details>
        <details><summary>Will Dhun update automatically?</summary><p>Recent versions offer optional update reminders. You choose when to download and install. Older versions without the updater need one manual download from this page. These download links point to the latest published previews.</p></details>
        <details><summary>Do I need an account? What data is shared?</summary><p>You can download and listen without a Dhun account. Cloud accounts and backups are optional. Anonymous usage sharing is also optional and off by default; enabling it sends only a random installation ID, app version and platform once per active day. It does not send your songs or email. Read our <a href="/#privacy">privacy notice</a>.</p></details>
        <details><summary>Are all songs available offline or with lyrics?</summary><p>Availability depends on the music and lyrics sources. Lyrics are shown when a matching result exists. Android supports device playlists and saved-track offline playback. The desktop preview plays imported local audio; offline downloading of online music is not included.</p></details>
        <details><summary>How do I report a problem?</summary><p>Use <a href="https://github.com/jaitak2121-spec/dhun-music/issues">Dhun support</a>. Include your app version, device, and what happened. Never post account exports, passwords or verification codes. This is a preview, so a small test group helps us improve reliability before a wider release.</p></details>
      </section>
      <section className={styles.credits} id="credits">
        <details><summary>Built with open source. Credits & licences <span aria-hidden="true">+</span></summary>
          <div className={styles.creditContent}><p>Dhun’s Android app builds on <a href="https://github.com/DominatorStufs/DollBloom">DollBloom</a> and BitChord. Thank you to their creators and the open-source community. The desktop companion uses Electron and yt-dlp; desktop lyrics are provided by LRCLIB.</p>
            <p>Dhun is distributed under GPLv3. Original copyright notices and component licences are retained. Installers include the relevant third-party notices.</p>
            <div className={styles.creditLinks}><a href={`${repo}/blob/main/NOTICE.md`}>Full credits</a><a href={`${repo}/blob/main/LICENSE`}>GPLv3 licence</a><a href={`${repo}/releases`}>Corresponding source & versions</a></div>
            <p>For each installer, Android-build.json or Desktop-build.json in the current preview release identifies its source revision. The matching versioned release provides the source archive.</p>
          </div>
        </details>
      </section>
    </main>
    <footer className={styles.footer}><span>Dhun<span className={styles.footerTag}>Your music. Your rhythm.</span></span><div><a href="/#privacy">Privacy</a><a href="/">Dhun Cloud</a><a href={`${repo}/issues`}>Support</a></div></footer>
  </div>;
}
