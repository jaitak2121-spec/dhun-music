// Real browser/API/auth/database check. Requires the app running on localhost.
// Fixture email is deliberately non-deliverable; never request verification mail.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { chromium } from '../../desktop/node_modules/@playwright/test/index.mjs';
const base=process.env.DHUN_TEST_URL || 'http://localhost:3000';
const sql=neon(process.env.DHUN_DATABASE_URL);
const email=`dhun-test-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('base64url');
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.getByRole('button',{name:'Create an account',exact:true}).click();
  await page.getByLabel('Your name').fill('Dhun disposable test');
  await page.getByLabel('Email',{exact:true}).first().fill(email);
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.getByRole('button',{name:'Sign out',exact:true}).waitFor();
  assert.match(await page.locator('main').innerText(),/Verify your email before storing a backup/);
  // This only verifies our disposable test identity. Production has no bypass route.
  await sql`UPDATE neon_auth."user" SET "emailVerified"=true WHERE email=${email}`;
  await page.reload();await page.getByRole('button',{name:'Enable optional backup',exact:true}).waitFor();
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button',{name:'Enable optional backup',exact:true}).click();
  await page.getByRole('button',{name:'Export my data',exact:true}).waitFor();
  const startResponse=await fetch(`${base}/api/cloud/connect-start`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Dhun disposable device'})});
  assert.equal(startResponse.status,200);const connection=await startResponse.json();
  const poll=()=>fetch(`${base}/api/cloud/connect-poll`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({deviceCode:connection.deviceCode})});
  assert.equal((await(await poll()).json()).pending,true);
  await page.goto(connection.verificationUrl);
  await page.getByRole('heading',{name:'Connect Dhun disposable device?',exact:true}).waitFor();
  await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'Approve this device',exact:true}).click();
  await page.getByRole('heading',{name:'Connect Dhun disposable device?',exact:true}).waitFor({state:'hidden'});
  await new Promise(resolve=>setTimeout(resolve,2100));
  const device=await(await poll()).json();assert.equal(typeof device.token,'string');
  const deviceHeaders={authorization:`Bearer ${device.token}`};
  assert.equal((await fetch(`${base}/api/cloud/device-backup`,{headers:deviceHeaders})).status,200);
  assert.equal((await fetch(`${base}/api/cloud/device-backup`)).status,401);
  assert.equal((await fetch(`${base}/api/cloud/owner`,{headers:deviceHeaders})).status,401);
  assert.equal((await poll()).status,400);
  const outcomes=await page.evaluate(async()=>{
    const s=await(await fetch('/api/cloud/session')).json();
    const post=async(body,csrf=s.csrf)=>{
      const r=await fetch('/api/cloud/backup',{method:'POST',headers:{'content-type':'application/json','x-dhun-csrf':csrf},body:JSON.stringify(body)});return{status:r.status,body:await r.json()};
    };
    const backup={revision:0,favourites:[{videoId:'dQw4w9WgXcQ',title:'Test favourite',artist:'Test artist',durationSeconds:200}],preferences:{theme:'indigo',appearance:'dark',reduceMotion:true}};
    const noCsrf=await post(backup,'wrong');const upload=await post(backup);const stale=await post(backup);
    const owner=await fetch('/api/cloud/owner');const exported=await(await fetch('/api/cloud/export')).json();
    const malicious=await post({...backup,revision:1,password:'must-never-store'});
    const erased=await fetch('/api/cloud/erase',{method:'POST',headers:{'content-type':'application/json','x-dhun-csrf':s.csrf},body:JSON.stringify({confirm:'ERASE'})});
    return{noCsrf:noCsrf.status,upload:upload.status,revision:upload.body.revision,stale:stale.status,owner:owner.status,exportedSongs:exported.profile.favourites.length,malicious:malicious.status,erased:erased.status};
  });
  assert.deepEqual(outcomes,{noCsrf:403,upload:200,revision:1,stale:409,owner:403,exportedSongs:1,malicious:400,erased:200});
  assert.equal((await fetch(`${base}/api/cloud/device-backup`,{headers:deviceHeaders})).status,401);
  await page.getByText('Delete your Dhun Cloud account',{exact:true}).click();
  await page.getByLabel('Account password',{exact:true}).fill(password);
  await page.getByLabel('Permanently delete my cloud account and backup.').check();
  await page.getByRole('button',{name:'Delete my account',exact:true}).click();
  await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
  assert.equal((await sql`SELECT id FROM neon_auth."user" WHERE email=${email}`).length,0);
  assert.deepEqual(errors,[]);
  console.log('PASS: real signup/session, verified-account gate, consent, device approval, one-time token redemption, scoped device access, backup/export, stale-write/CSRF rejection, non-owner denial, erase/device revocation and password-confirmed account deletion.');
}finally{
  await sql`DELETE FROM neon_auth."user" WHERE email=${email}`;
  await browser.close();console.log('Disposable browser account removed.');
}
