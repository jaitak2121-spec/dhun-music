// Explicit opt-in: creates a disposable identity and removes it in finally.
// Run against the configured test database with DHUN_RUN_CONNECTION_CHECK=true.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db } from '../lib/db.mjs';
import { startConnection, approveConnection, pollConnection, deviceIdentity } from '../lib/devices.mjs';
import { POLICY_VERSION, tokenHash } from '../lib/domain.mjs';

if (process.env.DHUN_RUN_CONNECTION_CHECK !== 'true') throw Error('Set DHUN_RUN_CONNECTION_CHECK=true to run this disposable-data check.');
const sql = db(), id = randomUUID(), connections = [];
let created = false;
try {
  await sql`INSERT INTO neon_auth."user" (id,name,email,"emailVerified","createdAt","updatedAt") VALUES (${id}::uuid,'Dhun connection check',${`dhun-check-${id}@example.invalid`},true,now(),now())`;
  created = true;
  for (const name of ['Dhun Android browser', 'Dhun Desktop']) {
    const connection = await startConnection(name);
    connections.push(connection);
    await assert.rejects(() => approveConnection({ id }, connection.userCode, false, POLICY_VERSION));
    assert.equal((await sql`SELECT user_id FROM dhun.connections WHERE secret_hash=${tokenHash(connection.deviceCode)}`)[0].user_id, null);
    const approved = await approveConnection({ id }, connection.userCode, true, POLICY_VERSION);
    assert.equal(approved.returnToApp, name === 'Dhun Android browser');
    const session = await pollConnection(connection.deviceCode);
    assert.equal(session.pending, undefined);
    const account = await deviceIdentity(new Request('https://example.invalid', { headers: { Authorization: `Bearer ${session.token}` } }));
    assert.equal(account.id, id);
    await assert.rejects(() => pollConnection(connection.deviceCode));
    await assert.rejects(() => approveConnection({ id }, connection.userCode, true, POLICY_VERSION));
  }
  console.log('PASS: consent, Android return flag, desktop compatibility, device identity and one-time redemption.');
} finally {
  for (const connection of connections) await sql`DELETE FROM dhun.connections WHERE secret_hash=${tokenHash(connection.deviceCode)}`;
  if (created) await sql`DELETE FROM neon_auth."user" WHERE id=${id}::uuid`;
  console.log('Disposable connection-check records removed.');
}
