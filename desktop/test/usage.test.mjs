import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {usageClient} from '../usage.mjs';
test('usage defaults off, sends once daily, has no personal fields, erases on opt-out and retries offline',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'dhun-usage-'));let day=1,offline=false;const requests=[];
  const usage=usageClient({file:path.join(dir,'usage.json'),platform:'mac',version:'0.6.2',now:()=>day*86400000,fetcher:async(url,options)=>{if(offline)throw Error('offline');requests.push({url,body:JSON.parse(options.body)});return{ok:true};}});
  try {
    await usage.foreground();assert.equal(requests.length,0);assert.equal((await usage.status()).enabled,false);
    await usage.set(true);await Promise.all([usage.foreground(),usage.foreground()]);assert.equal(requests.length,1);
    assert.deepEqual(Object.keys(requests[0].body).sort(),['installation','platform','version']);assert.match(requests[0].body.installation,/^[a-f0-9]{64}$/);
    day++;await usage.foreground();assert.equal(requests.length,2);
    offline=true;assert.equal((await usage.set(false)).pending,true);assert.equal((await usage.status()).enabled,false);
    offline=false;await usage.foreground();assert.ok(requests.at(-1).url.endsWith('/activity-erase'));assert.deepEqual(Object.keys(requests.at(-1).body),['installation']);
    const count=requests.length;await usage.foreground();assert.equal(requests.length,count);
    await usage.set(true);assert.notEqual(requests.at(-1).body.installation,requests[0].body.installation);
  } finally {await rm(dir,{recursive:true,force:true});}
});
