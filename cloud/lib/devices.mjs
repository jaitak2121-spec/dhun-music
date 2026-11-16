import { randomBytes } from 'node:crypto';
import { db } from './db.mjs';
import { ApiError, randomToken, tokenHash, validToken, POLICY_VERSION } from './domain.mjs';

export async function deviceIdentity(request) {
  const token=request.headers.get('authorization')?.replace(/^Bearer /,'');
  if (!validToken(token)) throw new ApiError(401,'Connect your Dhun account again.');
  const sql=db();
  const [row]=await sql`SELECT u.id,u.name,u.email,d.id AS device_id FROM dhun.devices d JOIN neon_auth."user" u ON u.id=d.user_id WHERE d.token_hash=${tokenHash(token)} AND d.expires_at>now() AND u."emailVerified"=true AND coalesce(u.banned,false)=false`;
  if(!row)throw new ApiError(401,'Your cloud connection expired or was revoked. Connect again.');
  return row;
}
export async function startConnection(name) {
  if(typeof name!=='string'||!name.trim()||name.length>60)throw new ApiError(400,'Invalid device name.');
  const sql=db(),secret=randomToken(),code=randomBytes(4).toString('hex').toUpperCase();
  await sql`DELETE FROM dhun.connections WHERE expires_at<now()`;
  await sql`INSERT INTO dhun.connections (secret_hash,user_code,name,expires_at) VALUES (${tokenHash(secret)},${code},${name},now()+interval '5 minutes')`;
  return {deviceCode:secret,userCode:code,expiresIn:300,interval:3};
}
export async function pollConnection(secret) {
  if(!validToken(secret))throw new ApiError(400,'Invalid device code.');
  const sql=db(),hash=tokenHash(secret);
  const [connection]=await sql`UPDATE dhun.connections SET last_polled_at=now() WHERE secret_hash=${hash} AND expires_at>now() AND redeemed_at IS NULL AND (last_polled_at IS NULL OR last_polled_at<now()-interval '2 seconds') RETURNING user_id`;
  if(!connection)throw new ApiError(400,'This connection expired, was already used, or was checked too quickly.');
  if(!connection.user_id)return{pending:true};
  const token=randomToken();
  const [device]=await sql`WITH claimed AS (UPDATE dhun.connections SET redeemed_at=now() WHERE secret_hash=${hash} AND expires_at>now() AND redeemed_at IS NULL AND user_id IS NOT NULL RETURNING user_id,name) INSERT INTO dhun.devices (user_id,token_hash,name,expires_at) SELECT c.user_id,${tokenHash(token)},c.name,now()+interval '30 days' FROM claimed c JOIN neon_auth."user" u ON u.id=c.user_id WHERE u."emailVerified"=true AND coalesce(u.banned,false)=false RETURNING id`;
  if(!device)throw new ApiError(400,'This connection is no longer available.');
  return{token,expiresIn:2592000};
}
export async function connectionInfo(code) {
  if(typeof code!=='string'||!/^[A-F0-9]{8}$/.test(code))throw new ApiError(400,'Invalid connection code.');
  const sql=db();
  const [row]=await sql`SELECT name,user_code FROM dhun.connections WHERE user_code=${code} AND expires_at>now() AND user_id IS NULL AND redeemed_at IS NULL`;
  if(!row)throw new ApiError(404,'This code expired or was already approved. Start again in the app.');
  return row;
}
export async function approveConnection(user,code,agree,policyVersion) {
  await connectionInfo(code);
  if(agree!==true||policyVersion!==POLICY_VERSION)throw new ApiError(400,'Explicit Dhun account connection consent is required.');
  const sql=db();
  const result=await sql.transaction([
    sql`INSERT INTO dhun.profiles (user_id,account_consent_version) VALUES (${user.id}::uuid,${POLICY_VERSION}) ON CONFLICT (user_id) DO UPDATE SET account_consent_version=${POLICY_VERSION}`,
    sql`UPDATE dhun.connections SET user_id=${user.id}::uuid WHERE user_code=${code} AND expires_at>now() AND user_id IS NULL AND redeemed_at IS NULL RETURNING user_code`,
  ]);
  if(!result[1].length)throw new ApiError(409,'This code expired or was already approved.');
  return{ok:true};
}
