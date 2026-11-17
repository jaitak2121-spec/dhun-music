 'use client';
import {useEffect,useRef,useState} from 'react';
const policyVersion='2026-11-16';
export default function Connect(){
  const [session,setSession]=useState(null),[csrf,setCsrf]=useState(''),[busy,setBusy]=useState(true),[message,setMessage]=useState('Getting your sign-in ready…'),[returnURL,setReturnURL]=useState(''),[connectionCode,setConnectionCode]=useState('');
  const finishing=useRef(false);
  const code=()=>new URL(location.href).searchParams.get('code');
  async function api(action,body,token=csrf){const response=await fetch('/api/cloud/'+action,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'content-type':'application/json','x-dhun-csrf':token},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await response.json();if(!response.ok)throw Error(data.error||'Please try again.');return data;}
  async function finish(token){
    if(finishing.current)return;finishing.current=true;setBusy(true);setMessage('Signed in. Returning to Dhun…');
    try{const data=await api('connect-complete',{code:code()},token);if(!/^[A-Za-z0-9_-]{43}$/.test(data.grant))throw Error('Invalid sign-in response.');
      const url='intent://account/return?grant='+data.grant+'#Intent;scheme=dhun;package=io.github.jaitak2121spec.dhun;end';
      setReturnURL(url);location.assign(url);
    }catch(error){setMessage(error.message);finishing.current=false;}finally{setBusy(false);}
  }
  useEffect(()=>{let active=true;(async()=>{
    setConnectionCode(code()||'');
    if(!/^[A-F0-9]{8}$/.test(code()||''))throw Error('Open sign-in from the Dhun app.');
    const data=await api('session');if(!active)return;setSession(data.user);setCsrf(data.csrf);
    if(data.user?.verified){const info=await api('connect-info?code='+code());if(!active)return;if(info.canFinish){await finish(data.csrf);return;}}
    setMessage('');setBusy(false);
  })().catch(error=>{if(active){setMessage(error.message);setBusy(false);}});return()=>{active=false;};},[]);
  async function begin(google){setBusy(true);setMessage('');try{
    await api('connect-begin',{code:code(),agree:true,policyVersion});
    if(!google){await finish(csrf);return;}
    const callbackURL=new URL('/connect',location.origin);callbackURL.searchParams.set('code',code());
    const response=await fetch('/api/auth/sign-in/social',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({provider:'google',dhunConsent:true,callbackURL:callbackURL.href,disableRedirect:true})});
    const data=await response.json();if(!response.ok||!data.url)throw Error(data.error||data.message||'Google sign-in is unavailable.');location.assign(data.url);
  }catch(error){setMessage(error.message);setBusy(false);}}
  return <main className="app-signin"><a href="/download" className="signin-brand"><img src="/logo.svg" width="64" height="64" alt=""/><strong>Dhun</strong></a><section className="card"><p className="eyebrow">YOUR MUSIC. YOUR RHYTHM.</p><h1>{returnURL?'You’re signed in.':'Welcome to Dhun.'}</h1><p>{returnURL?'Return to your music.':'Your music, with a little more you.'}</p>
    <p role="status" aria-live="polite">{message}</p>
    {returnURL?<a className="button" href={returnURL}>Return to Dhun</a>:<>{session?.verified?<><button disabled={busy} onClick={()=>begin(false)}>Continue as {session.name?.split(' ')[0]||'your account'}</button><button className="secondary" disabled={busy} onClick={()=>begin(true)}>Use another Google account</button></>:<button disabled={busy} onClick={()=>begin(true)}>{busy?'Please wait…':'Continue with Google'}</button>}
    <p className="signin-privacy">By continuing, you create or connect your Dhun account using your Google name, email and available profile photo. <a href="/#privacy" target="_blank" rel="noopener noreferrer">Privacy</a></p><small>Continue only if you started sign-in in Dhun. Connection code: {connectionCode}</small></>}
    </section><p className="signin-privacy">Listening history stays on your device. Backups and usage sharing are separate choices.</p></main>;
}
