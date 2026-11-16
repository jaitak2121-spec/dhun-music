import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {db} from '../lib/db.mjs';
import {activity,installationHash,usageOverview} from '../lib/activity.mjs';
if(process.env.DHUN_RUN_USAGE_CHECK!=='true')throw Error('Set DHUN_RUN_USAGE_CHECK=true for this disposable analytics check.');
const sql=db(),installation=randomBytes(32).toString('hex'),key=installationHash(installation);
try{
  await activity({installation,platform:'android',version:'0-test'});
  await activity({installation,platform:'android',version:'0-test'});
  const [row]=await sql`SELECT count(*)::int AS count FROM dhun.activity WHERE installation=${key}`;
  assert.equal(row.count,1);
  const overview=await usageOverview();assert.ok(overview.totals.today>=1);assert.ok(overview.versions.some(row=>row.version==='0-test'));
  const [access]=await sql`SELECT has_table_privilege('dhun_app','dhun.activity','SELECT') AS readable,has_table_privilege('dhun_app','dhun.activity','INSERT') AS writable`;
  assert.equal(access.readable,false);assert.equal(access.writable,false);
  await activity({installation},true);
  const [erased]=await sql`SELECT count(*)::int AS count FROM dhun.activity WHERE installation=${key}`;assert.equal(erased.count,0);
  console.log('Usage: daily deduplication, owner aggregate queries, role isolation and opt-out erasure passed.');
}finally{await sql`DELETE FROM dhun.activity WHERE installation=${key}`;}
