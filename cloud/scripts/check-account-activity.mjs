// Disposable identities only; never opts real accounts into activity sharing.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {db,asUser} from '../lib/db.mjs';
import {accountActivity,accountActivityConsent,accountUsageOverview,ACCOUNT_ACTIVITY_POLICY_VERSION as policyVersion} from '../lib/account-activity.mjs';
import {approveConnection,startConnection} from '../lib/devices.mjs';
import {POLICY_VERSION} from '../lib/domain.mjs';
if(process.env.DHUN_RUN_ACTIVITY_CHECK!=='true')throw Error('Set DHUN_RUN_ACTIVITY_CHECK=true to create disposable activity test records.');
const sql=db(),ids=[randomUUID(),randomUUID()];
try{
  for(const id of ids){
    await sql`INSERT INTO neon_auth."user" (id,name,email,"emailVerified","createdAt","updatedAt") VALUES (${id}::uuid,'Dhun activity check',${`dhun-activity-${id}@example.invalid`},true,now(),now())`;
    const connection=await startConnection('Dhun activity check');await approveConnection({id},connection.userCode,true,POLICY_VERSION);
    assert.equal((await accountActivity(id,{platform:'android',version:'1'})).enabled,false);
  }
  const consented=await startConnection('Dhun activity check');
  await approveConnection({id:ids[0]},consented.userCode,true,POLICY_VERSION,false,policyVersion);
  assert.equal((await sql`SELECT activity_consent_version FROM dhun.profiles WHERE user_id=${ids[0]}::uuid`)[0].activity_consent_version,policyVersion);
  const before=await accountUsageOverview();
  for(const id of ids)await accountActivityConsent(id,{agree:true,policyVersion});
  await Promise.all([accountActivity(ids[0],{platform:'android',version:'1'}),accountActivity(ids[0],{platform:'android',version:'1'}),accountActivity(ids[0],{platform:'mac',version:'2'}),accountActivity(ids[1],{platform:'windows',version:'3'})]);
  let overview=await accountUsageOverview();assert.equal(overview.totals.today,before.totals.today+2);assert.equal(overview.daily[0].accounts,before.totals.today+2);
  const [own]=await asUser(ids[0],[sql`SELECT user_id,day::text,platform,version FROM dhun.account_activity`]);assert.equal(own.length,2);assert.ok(own.every(row=>row.user_id===ids[0]));
  await assert.rejects(()=>asUser(ids[1],[sql`INSERT INTO dhun.account_activity (user_id,platform,version) VALUES (${ids[0]}::uuid,'mac','1')`]));
  await sql`INSERT INTO dhun.account_activity (user_id,day,platform,version) VALUES (${ids[0]}::uuid,(now() AT TIME ZONE 'UTC')::date-1,'mac','1')`;
  overview=await accountUsageOverview();assert.equal(overview.totals.returning_today,before.totals.returning_today+1);
  await Promise.all([accountActivity(ids[0],{platform:'android',version:'4'}),accountActivityConsent(ids[0],{agree:false,policyVersion})]);
  assert.equal((await sql`SELECT * FROM dhun.account_activity WHERE user_id=${ids[0]}::uuid`).length,0);
  assert.equal((await accountActivity(ids[0],{platform:'mac',version:'2'})).enabled,false);
  await sql`DELETE FROM dhun.profiles WHERE user_id=${ids[1]}::uuid`;
  assert.equal((await sql`SELECT * FROM dhun.account_activity WHERE user_id=${ids[1]}::uuid`).length,0);
  console.log('PASS: consent, deduplication, cross-platform totals, returning accounts, RLS, concurrent opt-out and deletion cascade.');
}finally{
  for(const id of ids)await sql`DELETE FROM neon_auth."user" WHERE id=${id}::uuid`;
  await sql`DELETE FROM dhun.connections WHERE name='Dhun activity check'`;
  console.log('Disposable account activity records removed.');
}
