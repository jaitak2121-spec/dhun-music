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
            <small>Open the APK, allow installation from your browser when prompted, then install.</small><a className={styles.setupLink} href="#android-setup">How to install on Android <span aria-hidden="true">↓</span></a>
          </article>
          <article className={styles.platform}>
            <span className={styles.platformIndex}>02 / DESKTOP</span><h3>Windows</h3><p>Windows 10+ · 64-bit</p>
            <a className={styles.installer} href="/api/download/windows">Download EXE <Arrow/></a>
            <small>Download and run the installer. Desktop previews are unsigned; Windows may show a warning.</small><a className={styles.setupLink} href="#windows-setup">How to install on Windows <span aria-hidden="true">↓</span></a>
          </article>
          <article className={styles.platform}>
            <span className={styles.platformIndex}>03 / DESKTOP</span><h3>Mac</h3><p>macOS 12+ · Choose your chip</p>
            <div className={styles.macLinks}><a className={styles.installer} href="/api/download/mac-arm64">Apple Silicon · DMG <Arrow/></a><a className={styles.intel} href="/api/download/mac-x64">Intel Mac · DMG <span aria-hidden="true">↗</span></a></div>
            <small>Check Apple menu → About This Mac. This preview is not notarized by Apple; macOS may ask for approval after installing or replacing it.</small><a className={styles.setupLink} href="#mac-setup">How to install on Mac <span aria-hidden="true">↓</span></a><a className={styles.setupLink} href="#siri-setup">Set up Siri shortcuts <span aria-hidden="true">↓</span></a>
          </article>
        </div>
        <p className={styles.downloadNote}>Direct installers, without ZIP extraction. These links always point to the latest published previews. Desktop features currently differ from Android.</p>
      </section>
      <div className={styles.deviceGuides}>
        <section className={styles.deviceGuide} aria-labelledby="android-setup">
          <p className={styles.eyebrow}>YOUR FIRST LISTEN ON ANDROID</p><h2 id="android-setup" tabIndex={-1}>Set up on Android.</h2>
          <p className={styles.setupIntro}>Android 8.0+ · Direct APK installation. Menu names can vary by phone.</p>
          <ol className={styles.setupSteps}>
            <li><strong>Download the APK from this page.</strong><p>Tap Download APK above. Read any browser warning before choosing whether to continue. Find the completed file in your browser’s Downloads.</p></li>
            <li><strong>Allow this installation source.</strong><p>Open Dhun.apk. If Android asks, tap Settings and enable Allow from this source for the browser or Files app you used to open it.</p></li>
            <li><strong>Install and open Dhun.</strong><p>Return to the installer, tap Install, then Open. If Play Protect offers to scan the app, let it complete.</p></li>
            <li><strong>Turn the source permission off afterward.</strong><p>In Settings → Apps → Special app access → Install unknown apps, select that browser or Files app and turn off Allow from this source. Dhun will still open normally.</p></li>
          </ol>
          <details className={styles.setupDetails}><summary>Updating your existing Dhun app</summary><p>Install the new APK over your existing app to keep local playlists and settings. In-app updates may separately ask you to allow installations from Dhun itself. If update verification fails, download a fresh APK here. If Android reports a conflicting signature or an incompatible package, keep the existing app and <a href="https://github.com/jaitak2121-spec/dhun-music/issues">contact support</a> before uninstalling.</p></details>
          <p className={styles.setupNote}>Keep Play Protect enabled. A browser file warning and a Play Protect threat detection are different messages. If Play Protect identifies Dhun as harmful or blocks it for security reasons, stop and report the exact alert.</p>
          <a className={styles.setupSource} href="https://support.google.com/pixelphone/answer/7391672?hl=en" target="_blank" rel="noopener noreferrer">Google’s installation guidance ↗</a><br/><a className={styles.setupSource} href="https://support.google.com/accounts/answer/2812853?hl=en" target="_blank" rel="noopener noreferrer">About Google Play Protect ↗</a>
        </section>
        <section className={styles.deviceGuide} aria-labelledby="windows-setup">
          <p className={styles.eyebrow}>YOUR FIRST LISTEN ON WINDOWS</p><h2 id="windows-setup" tabIndex={-1}>Set up on Windows.</h2>
          <p className={styles.setupIntro}>Windows 10+ · 64-bit. This desktop preview does not have a verified publisher signature.</p>
          <ol className={styles.setupSteps}>
            <li><strong>Download the Windows installer.</strong><p>Choose Download EXE above. Save Dhun-Windows-x64.exe, then open File Explorer → Downloads.</p></li>
            <li><strong>Open the installer.</strong><p>Double-click Dhun-Windows-x64.exe. Review any permission prompts before deciding to continue.</p></li>
            <li><strong>Read any SmartScreen message.</strong><p>If Windows shows “Windows protected your PC” for an unrecognized app, select More info to inspect the file and publisher. If you downloaded it here and choose to trust this preview, select Run anyway when available.</p></li>
            <li><strong>Finish setup and start listening.</strong><p>Follow the installer’s prompts, then open Dhun from the Start menu. Future updates are optional; install the newer version over the existing one to retain local app data.</p></li>
          </ol>
          <details className={styles.setupDetails}><summary>If Run anyway is missing</summary><p>A work or school policy, Windows S mode or Smart App Control can prevent installation. Ask your device administrator or <a href="https://github.com/jaitak2121-spec/dhun-music/issues">contact Dhun support</a> with the exact message. These instructions do not require changing those protections.</p></details>
          <p className={styles.setupNote}>Keep Microsoft Defender and SmartScreen enabled. If Windows Security reports a named threat, quarantines the installer or says it contains malware, stop and report it. The steps above apply to an unrecognized-app reputation prompt.</p>
          <a className={styles.setupSource} href="https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/publish-first-app#step-6-handle-smartscreen-for-new-apps" target="_blank" rel="noopener noreferrer">Microsoft’s SmartScreen guidance ↗</a>
        </section>
      </div>
      <section className={styles.macSetup} aria-labelledby="mac-setup">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>YOUR FIRST LISTEN ON MAC</p><h2 id="mac-setup" tabIndex={-1}>From download to play.</h2></div><p>Opening a new or updated Mac preview.</p></div>
        <p className={styles.setupIntro}>Dhun’s current Mac preview is not Developer ID-signed or notarized by Apple. You may see “Apple could not verify Dhun is free of malware” when opening it after installation or an update. Approval for an older copy may not carry over to a replacement; these previews may need approval again after each update.</p>
        <div className={styles.setupGrid}>
          <ol className={styles.setupSteps}>
            <li><strong>Choose your Mac download.</strong><p>In Apple menu → About This Mac, look for an Apple M-series chip or an Intel processor. Download the matching DMG above.</p></li>
            <li><strong>Move Dhun to Applications.</strong><p>Open the DMG, drag Dhun into Applications, then open Dhun from there.</p></li>
            <li><strong>Find the app-specific permission.</strong><p>If the Apple verification warning appears, click Done. Open System Settings → Privacy &amp; Security and scroll to the message that says “Dhun was blocked to protect your Mac.”</p></li>
            <li><strong>Choose whether to open this preview.</strong><p>If you downloaded Dhun from this page and want to proceed, click Open Anyway beside Dhun. Authenticate if asked, then click Open in the confirmation. Keep your Mac’s other security settings enabled.</p></li>
          </ol>
          <figure className={styles.setupImage}><a href="/screenshots/mac-open-anyway.png" target="_blank" rel="noopener noreferrer" aria-label="View full-size macOS Privacy and Security screenshot"><img src="/screenshots/mac-open-anyway.png" width="1008" height="292" loading="lazy" alt="macOS Privacy and Security showing Dhun was blocked to protect your Mac, with an Open Anyway button beside it"/></a><figcaption>Look for Open Anyway beside Dhun in Privacy &amp; Security. <a href="/screenshots/mac-open-anyway.png" target="_blank" rel="noopener noreferrer">View full-size screenshot ↗</a></figcaption><p className={styles.setupNote}>These steps apply to Apple’s unverified-app warning. If the alert says the app is damaged or will damage your computer, stop and <a href="https://github.com/jaitak2121-spec/dhun-music/issues">report the exact message</a>. A managed work or school Mac may not offer Open Anyway.</p><a className={styles.setupSource} href="https://support.apple.com/en-us/102445" target="_blank" rel="noopener noreferrer">Read Apple’s installation guidance ↗</a></figure>
        </div>
      </section>
      <section className={styles.macSetup} aria-labelledby="siri-setup">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>LESS TAPPING. MORE LISTENING.</p><h2 id="siri-setup" tabIndex={-1}>“Hey Siri, Play Dhun.”</h2></div><p>Mac · Dhun desktop 0.6.3 or later</p></div>
        <div className={styles.setupGrid}>
          <ol className={styles.setupSteps}>
            <li><strong>Install and open the latest Mac preview.</strong><p>Open Dhun once from Applications and choose a song or build a queue. Complete the first-launch steps above if macOS blocks opening it.</p></li>
            <li><strong>Create a shortcut in Apple Shortcuts.</strong><p>Open Shortcuts on your Mac and click +. If a Describe a Shortcut panel appears, click Edit to open the action editor. Add the URL action. Enter <code>dhun-music://play</code> as its URL. Add Open URLs after it so the URL is opened.</p></li>
            <li><strong>Name it Play Dhun.</strong><p>Run the shortcut once using the play button and review any permission prompt. It should open Dhun and start or resume your music.</p></li>
            <li><strong>Ask Siri using the shortcut’s name.</strong><p>Say “Hey Siri, Play Dhun.” You can create more shortcuts using the names and links beside these steps.</p></li>
          </ol>
          <div className={styles.setupImage}><h3>Playback shortcuts</h3><div className={styles.shortcutTable}><table><thead><tr><th>Shortcut name</th><th>URL action</th></tr></thead><tbody><tr><td>Play Dhun</td><td><code>dhun-music://play</code></td></tr><tr><td>Pause Dhun</td><td><code>dhun-music://pause</code></td></tr><tr><td>Next in Dhun</td><td><code>dhun-music://next</code></td></tr><tr><td>Previous in Dhun</td><td><code>dhun-music://previous</code></td></tr></tbody></table></div><p className={styles.setupNote}>This setup runs named Apple Shortcuts. General requests such as “play this artist in Dhun” are not supported yet. Play starts or resumes your queue; if it is empty, Dhun uses favourites, recent tracks or imported local music. On a fresh library, choose a song in Dhun first.</p><a className={styles.setupSource} href="https://support.apple.com/guide/shortcuts-mac/apd07c25bb38/mac" target="_blank" rel="noopener noreferrer">Apple’s guide to running shortcuts with Siri ↗</a></div>
        </div>
      </section>
      <section className={styles.help} id="help"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>A SMOOTH FIRST LISTEN</p><h2>Before you press play.</h2></div></div>
        <details><summary>How do I install Dhun on Android?</summary><p>Follow the <a href="#android-setup">Android setup guide above</a> for installation permissions, updates and Play Protect messages.</p></details>
        <details><summary>Why might my browser or computer show a warning?</summary><p>Dhun is a preview distributed directly. Chrome may warn about APK files downloaded outside a store. Windows installers are unsigned; Mac previews are not Apple-notarized and may be blocked. A download warning alone is not a malware scan result, and we cannot promise warning-free installation. Download only through these official links. If your security software specifically detects a threat, stop and report the exact message.</p></details>
        <details><summary>Which Mac download should I choose?</summary><p>Open Apple menu → About This Mac. Choose Apple Silicon if it lists an Apple M-series chip, or Intel if it lists an Intel processor. Follow the <a href="#mac-setup">Mac installation guide above</a> for the first-launch steps and screenshot.</p></details>
        <details><summary>Why did the Mac warning return after updating?</summary><p>Replacing Dhun installs a different app build. Current Mac previews use an ad-hoc signature and are not Developer ID-signed or notarized by Apple, so macOS may check and block the new copy even if you approved the previous one. Follow the <a href="#mac-setup">Mac setup guide</a> for that replacement. A consistent Developer ID signature and Apple notarization are needed for the normal trusted distribution experience. If the message reports damage or a specific threat, contact support with the exact wording.</p></details>
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
