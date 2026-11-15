import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from '@neondatabase/serverless';
if (!process.env.DHUN_DATABASE_URL) throw Error('Real Dhun database configuration is required.');
const pool=new Pool({connectionString:process.env.DHUN_DATABASE_URL});
const connection=await pool.connect();
const a=randomUUID(),b=randomUUID();
try{
  await connection.query('BEGIN');
  for(const id of [a,b]){
    await connection.query('INSERT INTO neon_auth."user" (id,name,email,"emailVerified","createdAt","updatedAt") VALUES ($1,\'Dhun isolation fixture\',$2,true,now(),now())',[id,`${id}@example.invalid`]);
    await connection.query('INSERT INTO dhun.profiles (user_id,account_consent_version,backup_consent_version,backup_consented_at) VALUES ($1,\'test\',\'test\',now())',[id]);
  }
  await connection.query('SELECT set_config(\'dhun.user_id\',$1,true)',[a]);
  await connection.query('SET LOCAL ROLE dhun_app');
  let result=await connection.query('SELECT user_id FROM dhun.profiles');assert.deepEqual(result.rows.map(x=>x.user_id),[a]);
  result=await connection.query('UPDATE dhun.profiles SET revision=revision+1 WHERE user_id=$1 RETURNING user_id',[b]);assert.equal(result.rowCount,0);
  result=await connection.query('DELETE FROM dhun.profiles WHERE user_id=$1 RETURNING user_id',[b]);assert.equal(result.rowCount,0);
  result=await connection.query('UPDATE dhun.profiles SET revision=revision+1 WHERE user_id=$1 AND revision=0 RETURNING revision',[a]);assert.equal(result.rows[0].revision,1);
  result=await connection.query('UPDATE dhun.profiles SET revision=revision+1 WHERE user_id=$1 AND revision=0 RETURNING revision',[a]);assert.equal(result.rowCount,0);
  await connection.query('SAVEPOINT forbidden');
  await assert.rejects(connection.query('SELECT * FROM dhun.connections'),error=>error.code==='42501');
  await connection.query('ROLLBACK TO SAVEPOINT forbidden');
  await connection.query('SELECT set_config(\'dhun.user_id\',\'\',true)');
  result=await connection.query('SELECT * FROM dhun.profiles');assert.equal(result.rowCount,0);
  await connection.query('RESET ROLE');
  await connection.query('DELETE FROM neon_auth."user" WHERE id=$1',[a]);
  result=await connection.query('SELECT * FROM dhun.profiles WHERE user_id=$1',[a]);assert.equal(result.rowCount,0);
  console.log('PASS: real Postgres isolates accounts, rejects cross-user mutations, prevents stale writes, denies secret-table access, and cascades account deletion.');
}finally{await connection.query('ROLLBACK');connection.release();await pool.end();console.log('Isolation fixtures rolled back; no test accounts retained.');}
