// SPDX-License-Identifier: GPL-3.0-only
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
// Main-process only: no accounts, songs, URLs or device identifiers enter the payload.
export function usageClient({file,platform,version,fetcher=fetch,now=Date.now}) {
  let state, pending=Promise.resolve();
  async function load(){if(!state){try{state=JSON.parse(await readFile(file,'utf8'));}catch{state={enabled:false};}}return state;}
  const save=()=>writeFile(file,JSON.stringify(state),{mode:0o600});
  async function send(action,body){const response=await fetcher('https://dhun-cloud.vercel.app/api/cloud/'+action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(4000),redirect:'error'});if(!response.ok)throw Error('Usage service unavailable.');}
  function queue(action){const result=pending.then(action);pending=result.catch(()=>{});return result;}
  async function report(){
    if(state.erase){if(state.installation)await send('activity-erase',{installation:state.installation});delete state.installation;delete state.day;delete state.erase;await save();}
    if(state.enabled!==true)return;
    const day=Math.floor(now()/86400000);if(state.day===day)return;
    if(!state.installation){state.installation=randomBytes(32).toString('hex');await save();}
    await send('activity',{installation:state.installation,platform,version});state.day=day;await save();
  }
  return {
    status:async()=>({enabled:(await load()).enabled===true}),
    set:value=>queue(async()=>{if(typeof value!=='boolean')throw Error('Choose on or off.');await load();state.enabled=value;if(!value)state.erase=true;await save();try{await report();return{enabled:value,pending:false};}catch{return{enabled:value,pending:true};}}),
    foreground:()=>queue(async()=>{await load();try{await report();}catch{/* Retry when foregrounded again. */}}),
  };
}
