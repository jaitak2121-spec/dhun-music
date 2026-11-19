// SPDX-License-Identifier: GPL-3.0-only
import {readFile,writeFile} from 'node:fs/promises';
// Main process only. Credentials remain in the existing encrypted session store.
export function accountActivityClient({file,platform,version,api,now=Date.now}){
  let state,pending=Promise.resolve();
  async function load(){if(!state){try{state=JSON.parse(await readFile(file,'utf8'));}catch{state={enabled:false};}}}
  const save=()=>writeFile(file,JSON.stringify(state),{mode:0o600});
  function queue(action){const result=pending.then(async()=>{await load();return action();});pending=result.catch(()=>{});return result;}
  async function report(){
    if(state.disablePending){await api('device-activity-consent',{agree:false,policyVersion:'2026-11-19'});state={enabled:false};await save();}
    if(state.enabled!==true)return;
    const day=Math.floor(now()/86400000)+':'+version;if(state.day===day)return;
    const data=await api('device-activity',{platform,version});state.enabled=data.enabled===true;state.day=day;await save();
  }
  return{
    observe:enabled=>queue(async()=>{if(!state.disablePending)state.enabled=enabled===true;await save();return{enabled:state.enabled===true};}),
    set:enabled=>queue(async()=>{
      if(typeof enabled!=='boolean')throw Error('Choose on or off.');
      if(!enabled){state={enabled:false,disablePending:true};await save();try{await report();return{enabled:false,pending:false};}catch{return{enabled:false,pending:true};}}
      await api('device-activity-consent',{agree:true,policyVersion:'2026-11-19'});state={enabled:true};await save();return{enabled:true,pending:false};
    }),
    reset:()=>queue(async()=>{state={enabled:false};await save();}),
    foreground:()=>queue(async()=>{try{await report();}catch{/* Retry on next app foreground. */}}),
  };
}
