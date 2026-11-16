import styles from './download.module.css';

const repo = 'https://github.com/jaitak2121-spec/dhun-music';
const release = `${repo}/releases/download/preview`;
const description = 'Your music. Your rhythm. Download Dhun for Android, Windows and Mac.';

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
      <nav aria-label="Primary"><a href="#credits">Credits</a><a href="/">Dhun Cloud <span aria-hidden="true">↗</span></a></nav>
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
      <section className={styles.downloads}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>TAKE YOUR MUSIC WITH YOU</p><h2 id="download" tabIndex={-1}>Find your Dhun.</h2></div><p>Free preview.<br/>{' '}No account needed to download.</p></div>
        <div className={styles.platforms}>
          <article className={styles.platform}>
            <span className={styles.platformIndex}>01 / MOBILE</span><h3>Android</h3><p>Android 8.0+ · ARM phones</p>
            <a className={styles.installer} href={`${release}/Dhun.apk`}>Download APK <Arrow/></a>
            <small>Open the APK, allow installation from your browser when prompted, then install.</small>
          </article>
          <article className={styles.platform}>
            <span className={styles.platformIndex}>02 / DESKTOP</span><h3>Windows</h3><p>Windows 10+ · 64-bit</p>
            <a className={styles.installer} href={`${release}/Dhun-Windows-x64.exe`}>Download EXE <Arrow/></a>
            <small>Download and run the installer. Desktop previews are unsigned; Windows may show a warning.</small>
          </article>
          <article className={styles.platform}>
            <span className={styles.platformIndex}>03 / DESKTOP</span><h3>Mac</h3><p>macOS 12+ · Choose your chip</p>
            <div className={styles.macLinks}><a className={styles.installer} href={`${release}/Dhun-Mac-arm64.dmg`}>Apple Silicon · DMG <Arrow/></a><a className={styles.intel} href={`${release}/Dhun-Mac-x64.dmg`}>Intel Mac · DMG <span aria-hidden="true">↗</span></a></div>
            <small>Check Apple menu → About This Mac. These previews are unsigned and not notarized; macOS may block opening.</small>
          </article>
        </div>
        <p className={styles.downloadNote}>Direct installers, without ZIP extraction. These links always point to the latest published previews. Desktop features currently differ from Android.</p>
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
