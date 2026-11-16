'use client';
import { useEffect, useState } from 'react';
import { createAuthClient } from '@neon/auth/next';
const client = createAuthClient();
const policyVersion = '2026-11-16';

export default function Portal() {
  const [session, setSession] = useState(null), [csrf, setCsrf] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [register, setRegister] = useState(false), [profile, setProfile] = useState(null), [accounts, setAccounts] = useState(null);
  const [connection,setConnection]=useState(null);
  async function api(action, body) {
    const response = await fetch(`/api/cloud/${action}`, { method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'x-dhun-csrf': csrf }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const data = await response.json(); if (!response.ok) throw Error(data.error || 'Please try again.'); return data;
  }
  async function refresh() {
    const data = await api('session'); setSession(data.user); setCsrf(data.csrf);
    if (data.user?.verified) setProfile((await api('backup')).profile);
    else setProfile(null);
  }
  useEffect(() => { refresh().catch(error => setMessage(error.message)).finally(() => setLoading(false)); }, []);
  useEffect(()=>{const code=new URL(location.href).searchParams.get('connect');if(code&&session?.verified)api(`connect-info?code=${encodeURIComponent(code)}`).then(setConnection).catch(error=>setMessage(error.message));},[session?.verified]);
  async function run(action) { setBusy(true); setMessage(''); try { await action(); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }
  async function login(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await run(async () => {
      const payload = { email: form.get('email'), password: form.get('password'), ...(register ? { name: form.get('name'), dhunConsent: form.get('consent') === 'on' } : {}) };
      // Use the SDK's same-origin auth proxy; credentials never enter Dhun's data tables.
      const response = await fetch(`/api/auth/${register ? 'sign-up' : 'sign-in'}/email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json(); if (!response.ok) throw Error(data.message || 'Could not sign in. Check your details and try again.');
      await refresh(); setMessage(register ? 'Account created. Verify your email to enable a backup.' : 'Welcome back.');
    });
  }
  async function authAction(action, success) { const result = await action(); if (result.error) throw Error(result.error.message || 'Please try again.'); setMessage(success); }
  function download(data) {
    const link = document.createElement('a'); const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    link.href=url;link.download='Dhun-cloud-export.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <main>
    <header><img src="/logo.svg" alt=""/><strong>Dhun</strong><span>YOUR MUSIC. YOUR CHOICE.</span></header>
    <p className="eyebrow">DHUN CLOUD · EARLY PREVIEW</p><h1>A little peace of mind.<br/>For your music.</h1>
    <p>An optional home for your online favourites and appearance settings. Dhun works without an account. Nothing from the installed app is uploaded just by visiting this page.</p>
    <div className="notice" role="status" aria-live="polite">{loading ? 'Checking your account…' : message}</div>
    {!loading && !session && <div className="grid">
      <section className="card"><h2>{register ? 'Make yourself at home.' : 'Welcome back.'}</h2><form onSubmit={login}>
        {register && <label>Your name<input name="name" autoComplete="name" maxLength={100} required/></label>}
        <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
        <label>Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={8} maxLength={128} required/></label>
        {register && <label><input type="checkbox" name="consent" required/>I agree to the <a href="#privacy">account privacy notice</a>. My name and email will be stored by Dhun and its account provider.</label>}
        <button disabled={busy}>{register ? 'Create account' : 'Sign in'}</button>
        <button className="secondary" type="button" disabled={busy} onClick={()=>setRegister(!register)}>{register ? 'I have an account' : 'Create an account'}</button>
      </form><details><summary>Forgot your password?</summary><form onSubmit={e=>{e.preventDefault();const email=new FormData(e.currentTarget).get('email');run(()=>authAction(()=>client.emailOtp.sendVerificationOtp({email,type:'forget-password'}),'If this account exists, a reset code has been requested.'));}}><label>Email<input name="email" type="email" autoComplete="email" required/></label><button disabled={busy}>Request reset code</button></form><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(()=>authAction(()=>client.emailOtp.resetPassword({email:f.get('email'),otp:f.get('otp'),password:f.get('password')}),'Password reset. You can sign in now.'));}}><label>Email<input name="email" type="email" autoComplete="email" required/></label><label>Reset code<input name="otp" autoComplete="one-time-code" required/></label><label>New password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required/></label><button disabled={busy}>Reset password</button></form></details></section>
      <section className="card"><h2>Only what you choose.</h2><p>Your account stores your name and email. Enabling a backup separately lets Dhun store online song titles, artists, video IDs and appearance preferences.</p><p>There is no listening history or analytics collection here. Google credentials, YouTube cookies, audio files and local file paths are excluded.</p><p>Cloud backup is an early preview. In current Dhun previews, open Settings → Dhun Cloud to connect a device and manually back up supported data.</p></section>
    </div>}
    {session && <div className="grid">
      {connection && <section className="card full"><h2>Connect {connection.name}?</h2><p>Check that the app shows this code: <strong>{connection.user_code}</strong>. Approve only a device you are using. The connection lasts 30 days and can read and upload your cloud backup.</p><form onSubmit={e=>{e.preventDefault();run(async()=>{await api('connect-approve',{code:connection.user_code,agree:true,policyVersion});setConnection(null);await refresh();setMessage('Device approved. Return to Dhun to upload or restore a backup.');history.replaceState(null,'','/');});}}><label><input type="checkbox" required/>I choose to connect this device and enable cloud backup of my online favourites and appearance settings. The Dhun owner can access stored cloud data to operate the service.</label><button disabled={busy}>Approve this device</button></form></section>}
      <section className="card"><h2>Hello, {session.name || 'music lover'}.</h2><p>{session.email}</p><p>{session.verified ? 'Email verified.' : 'Verify your email before storing a backup.'}</p>
        {!session.verified && <><button disabled={busy} onClick={()=>run(()=>authAction(()=>client.emailOtp.sendVerificationOtp({email:session.email,type:'email-verification'}),'Verification code requested. Check your inbox.'))}>Send verification code</button><form onSubmit={e=>{e.preventDefault();const otp=new FormData(e.currentTarget).get('otp');run(async()=>{await authAction(()=>client.emailOtp.verifyEmail({email:session.email,otp}),'Email verified.');await refresh();});}}><label>Email code<input name="otp" autoComplete="one-time-code" required maxLength={16}/></label><button disabled={busy}>Verify email</button></form></>}
        <button className="secondary" disabled={busy} onClick={()=>run(async()=>{await authAction(()=>client.signOut(),'Signed out.');setAccounts(null);await refresh();})}>Sign out</button>
        {session.verified && !profile && <button className="secondary" disabled={busy} onClick={()=>run(async()=>download(await api('export')))}>Export my account data</button>}
      </section>
      {session.verified && <section className="card"><h2>Your cloud backup</h2><p>{profile ? `Enabled · revision ${profile.revision} · ${profile.favourites.length} favourites.` : 'Off. No favourites or settings have been stored.'}</p>
        {!profile ? <form onSubmit={e=>{e.preventDefault();run(async()=>{await api('consent',{agree:true,policyVersion});await refresh();setMessage('Backup enabled. You can erase it at any time.');});}}><label><input type="checkbox" required/>I choose to store online favourites and appearance settings in Dhun Cloud. The app owner can access this data to operate the service. I have read the <a href="#privacy">privacy notice</a>.</label><button disabled={busy}>Enable optional backup</button></form> : <><button className="secondary" disabled={busy} onClick={()=>run(async()=>{download(await api('export'));setMessage('Your account and backup export is ready.');})}>Export my data</button><details><summary>Erase cloud backup</summary><p>This deletes cloud favourites, preferences and connected-device access. It keeps your account and local app data.</p><form onSubmit={e=>{e.preventDefault();const confirm=new FormData(e.currentTarget).get('confirm');run(async()=>{await api('erase',{confirm});await refresh();setMessage('Cloud backup erased.');});}}><label>Type ERASE<input name="confirm" required pattern="ERASE" autoComplete="off"/></label><button className="secondary danger" disabled={busy}>Erase backup</button></form></details></>}
      </section>}
      <section className="card full"><details><summary>Delete your Dhun Cloud account</summary><p>Permanently deletes your Dhun account and its cloud backup. Your music on this device stays on this device. Enter your account password to confirm.</p><form onSubmit={e=>{e.preventDefault();const password=new FormData(e.currentTarget).get('password');run(async()=>{await api('delete-account',{password,confirm:'DELETE'});setMessage('Account deleted.');setAccounts(null);await refresh();});}}><label>Account password<input name="password" type="password" autoComplete="current-password" required/></label><label><input type="checkbox" required/>Permanently delete my cloud account and backup.</label><button className="secondary danger" disabled={busy}>Delete my account</button></form></details></section>
      {session.owner && <section className="card full"><h2>Owner overview</h2><p>Only accounts that explicitly enabled cloud backups appear here. No playback tracking.</p><button className="secondary" disabled={busy} onClick={()=>run(async()=>setAccounts((await api('owner')).accounts))}>Load opted-in accounts</button>{accounts && <div className="scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Favourites</th><th>Backup consent</th></tr></thead><tbody>{accounts.map((a,i)=><tr key={i}><td>{a.name}</td><td>{a.email}</td><td>{a.favourites_count}</td><td>{new Date(a.backup_consented_at).toLocaleDateString()}</td></tr>)}</tbody></table>{!accounts.length&&<p>No opted-in accounts yet.</p>}</div>}</section>}
    </div>}
    <details id="privacy"><summary>Privacy notice · {policyVersion}</summary><p>Dhun Cloud is operated by the Dhun project owner. Account creation stores your name, email address and authentication records with Neon, our account and database provider. Passwords are handled by managed authentication; they are never included in backups or the owner dashboard.</p><p>Backup storage is separately optional. When enabled, we store online favourites (video ID, title, artist and duration), appearance preferences, consent dates and backup revision. The owner can access cloud data to operate the service. No sale of data, advertising profiles or listening analytics is implemented. No Google passwords, YouTube session cookies, local file paths or audio files are collected.</p><p>Data is stored in the Singapore database region. Vercel hosts this portal. Providers may process connection metadata for security and infrastructure operation. Temporary request-rate counters use hashed network addresses and expire after ten minutes; your raw network address is not stored in Dhun's data tables.</p><p>Use Export my data, Erase cloud backup, or Delete my account above. Account deletion removes active account and backup rows; provider recovery backups may retain deleted records under their retention policies. Contact the project owner through the <a href="https://github.com/jaitak2121-spec/dhun-music/issues">Dhun project</a> for support; never post passwords or private account exports publicly.</p><p>This is an early preview. Email currently uses the provider's shared test delivery service. Availability and deliverability are not ready for a large public rollout.</p></details>
    <footer><a href="/download">Download Dhun</a> · Dhun · Your music. Your rhythm. <a href="https://github.com/jaitak2121-spec/dhun-music">Source code</a></footer>
  </main>;
}
