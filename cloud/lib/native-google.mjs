import { db } from './db.mjs';
import { auth } from './auth.mjs';
import { startConnection } from './devices.mjs';
import { ApiError, POLICY_VERSION, randomToken, tokenHash, validUserId, googleNativeConfig, validateNativeGoogle } from './domain.mjs';

const DEVICE_NAME = 'Dhun Android native';

export async function startNativeGoogle() {
  const config = googleNativeConfig();
  if (!config.enabled) throw new ApiError(503, 'Native Google sign-in is being configured. Please try again later.');
  const connection = await startConnection(DEVICE_NAME);
  return { serverClientId: config.serverClientId, challenge: connection.deviceCode, nonce: tokenHash(connection.deviceCode), expiresIn: connection.expiresIn };
}

export async function completeNativeGoogle(body) {
  const config = googleNativeConfig();
  if (!config.enabled) throw new ApiError(503, 'Native Google sign-in is not enabled yet.');
  validateNativeGoogle(body, config.serverClientId);
  const sql = db(), hash = tokenHash(body.challenge);
  const [pending] = await sql`SELECT secret_hash FROM dhun.connections WHERE secret_hash=${hash} AND name=${DEVICE_NAME} AND user_id IS NULL AND redeemed_at IS NULL AND expires_at>now()`;
  if (!pending) throw new ApiError(401, 'This sign-in expired or was already used. Start again.');

  // Managed Google auth verifies the signature and audience and links identity.
  // Never create or link users from the decoded JWT or a client-supplied email.
  const result = await auth().signIn.social({ provider: 'google', idToken: { token: body.idToken, nonce: hash } });
  const userId = result.data?.user?.id;
  if (result.error || !validUserId(userId)) throw new ApiError(401, 'Google could not verify this sign-in. Please try again.');
  const [user] = await sql`SELECT id,name,email FROM neon_auth."user" WHERE id=${userId}::uuid AND "emailVerified"=true AND coalesce(banned,false)=false`;
  if (!user) throw new ApiError(403, 'A verified Google account is required.');
  const token = randomToken();
  const results = await sql.transaction([
    sql`INSERT INTO dhun.profiles (user_id,account_consent_version) VALUES (${user.id}::uuid,${POLICY_VERSION}) ON CONFLICT (user_id) DO UPDATE SET account_consent_version=${POLICY_VERSION}`,
    sql`WITH claimed AS (UPDATE dhun.connections SET user_id=${user.id}::uuid,redeemed_at=now() WHERE secret_hash=${hash} AND name=${DEVICE_NAME} AND user_id IS NULL AND redeemed_at IS NULL AND expires_at>now() RETURNING user_id,name) INSERT INTO dhun.devices (user_id,token_hash,name,expires_at) SELECT user_id,${tokenHash(token)},name,now()+interval '30 days' FROM claimed RETURNING id`,
  ]);
  if (!results[1].length) throw new ApiError(409, 'This sign-in was already used. Start again.');
  return { token, expiresIn: 2592000, account: user };
}
