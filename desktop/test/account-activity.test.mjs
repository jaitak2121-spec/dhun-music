import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {accountActivityClient} from '../account-activity.mjs';
test('account signals require consent, deduplicate daily, retry deletion and respect server revocation',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'dhun-account-activity-'));let day=1,offline=false,allowed=true;const sent=[];
  const args={file:path.join(dir,'activity.json'),platform:'mac',version:'0.6.5',now:()=>day*86400000,api:async(action,body)=>{if(offline)throw Error('offline');sent.push({action,body});return{enabled:allowed};}};
  const activity=accountActivityClient(args);
  try{
    await activity.foreground();assert.equal(sent.length,0);
    await activity.observe(false);await activity.foreground();assert.equal(sent.length,0);
    await activity.set(true);await Promise.all([activity.foreground(),activity.foreground()]);assert.equal(sent.length,2);
    assert.deepEqual(sent[1],{action:'device-activity',body:{platform:'mac',version:'0.6.5'}});
    day++;await activity.foreground();assert.equal(sent.length,3);
    offline=true;assert.equal((await activity.set(false)).pending,true);
    await activity.observe(true);offline=false;await activity.foreground();assert.equal(sent.at(-1).action,'device-activity-consent');assert.equal(sent.at(-1).body.agree,false);
    const count=sent.length;await activity.foreground();assert.equal(sent.length,count);
    await activity.set(true);allowed=false;await activity.foreground();const stopped=sent.length;day++;await activity.foreground();assert.equal(sent.length,stopped);
    await activity.reset();await activity.foreground();assert.equal(sent.length,stopped);
    await assert.rejects(()=>activity.set('yes'));
  }finally{await rm(dir,{recursive:true,force:true});}
});
