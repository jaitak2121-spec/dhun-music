import { db, asUser } from '../../../../lib/db.mjs';
import { ApiError, POLICY_VERSION, validateBackup } from '../../../../lib/domain.mjs';
import { csrfToken, csrfCheck, identity, verifiedIdentity, isOwner, jsonBody, respond, limit, publicOrigin } from '../../../../lib/http.mjs';
import { auth } from '../../../../lib/auth.mjs';
import { deviceIdentity, startConnection, pollConnection, connectionInfo, approveConnection } from '../../../../lib/devices.mjs';

export const dynamic = 'force-dynamic';
export async function GET(request, context) {
  return respond(async () => {
    const { action } = await context.params;
    if (action === 'native-google-config') return { enabled: false };
    if (action === 'session') {
      const csrf = await csrfToken();
      try { const user = await identity(); return { csrf, user: { name: user.name, email: user.email, verified: user.emailVerified, owner: isOwner(user) } }; }
      catch (error) { if (error.status === 401) return { csrf, user: null }; throw error; }
    }
    if (action === 'connect-info') { await verifiedIdentity(); await limit(request,'connection-info',30); return connectionInfo(new URL(request.url).searchParams.get('code')); }
    const user = ['device-backup','device-account'].includes(action) ? await deviceIdentity(request) : await verifiedIdentity(); const sql = db();
    if (action === 'device-account') return { account: { id: user.id, name: user.name, email: user.email } };
    if (action === 'owner') {
      if (!isOwner(user)) throw new ApiError(403, 'Owner access is required.');
      // Only accounts that explicitly approved a Dhun device or backup appear here.
      const accounts = await sql`SELECT u.id, u.name, u.email, p.account_consented_at, p.backup_consented_at, p.updated_at, p.revision, jsonb_array_length(p.favourites) AS favourites_count FROM dhun.profiles p JOIN neon_auth."user" u ON u.id=p.user_id ORDER BY p.updated_at DESC LIMIT 200`;
      return { accounts };
    }
    if (!['backup', 'export','device-backup'].includes(action)) throw new ApiError(404, 'Not found.');
    const [[profile]] = await asUser(user.id, [sql`SELECT account_consent_version, account_consented_at, backup_consent_version, backup_consented_at, revision, favourites, preferences, updated_at FROM dhun.profiles WHERE user_id=${user.id}::uuid`]);
    return { profile: profile || null, ...(action === 'device-backup' ? { email:user.email } : {}), ...(action === 'export' ? { account: { name: user.name, email: user.email }, policyVersion: POLICY_VERSION } : {}) };
  });
}
export async function POST(request, context) {
  return respond(async () => {
    const { action } = await context.params;
    if (action === 'native-google-start' || action === 'native-google-complete') {
      throw new ApiError(503, 'Update Dhun to use secure Google browser sign-in. Your account and music are unchanged.');
    }
    if (action === 'connect-start') { await limit(request,'connection-start',10);const body=await jsonBody(request);const result=await startConnection(body.name);return{...result,verificationUrl:`${publicOrigin()}/?connect=${result.userCode}`}; }
    if (action === 'connect-poll') { await limit(request,'connection-poll',150);const body=await jsonBody(request);return pollConnection(body.deviceCode); }
    const native = ['device-backup','device-disconnect'].includes(action);
    if(!native)await csrfCheck(request);
    await limit(request, 'data', 60);
    const user = native ? await deviceIdentity(request) : action === 'delete-account' ? await identity() : await verifiedIdentity();
    const body = await jsonBody(request); const sql = db();
    if(action === 'connect-approve')return approveConnection(user,body.code,body.agree,body.policyVersion);
    if(action === 'device-disconnect'){await asUser(user.id,[sql`DELETE FROM dhun.devices WHERE id=${user.device_id}::uuid AND user_id=${user.id}::uuid`]);return{ok:true};}
    if (action === 'delete-account') {
      if (body.confirm !== 'DELETE') throw new ApiError(400, 'Confirm account deletion.');
      // Managed deleteUser is disabled on this provider. Reauthenticate through
      // managed auth, then delete this exact identity from its own Postgres store.
      let result;
      if (typeof body.otp === 'string' && /^\d{6}$/.test(body.otp)) result = await auth().signIn.emailOtp({ email: user.email, otp: body.otp });
      else {
        if (typeof body.password !== 'string' || !body.password || body.password.length > 128) throw new ApiError(400, 'Confirm deletion with your password or a fresh email code.');
        result = await auth().signIn.email({ email: user.email, password: body.password });
      }
      if (result.error || result.data?.user?.id !== user.id) throw new ApiError(403, 'Account verification did not match.');
      await sql`DELETE FROM neon_auth."user" WHERE id=${user.id}::uuid`;
      await auth().signOut();
      return { ok: true };
    }
    if (action === 'consent') {
      if (body.agree !== true || body.policyVersion !== POLICY_VERSION) throw new ApiError(400, 'Explicit backup consent is required.');
      await asUser(user.id, [sql`INSERT INTO dhun.profiles (user_id,account_consent_version,backup_consent_version,backup_consented_at) VALUES (${user.id}::uuid,${POLICY_VERSION},${POLICY_VERSION},now()) ON CONFLICT (user_id) DO UPDATE SET backup_consent_version=${POLICY_VERSION},backup_consented_at=now()`]);
      return { ok: true };
    }
    if (action === 'backup' || action === 'device-backup') {
      const backup = validateBackup(body);
      const [rows] = await asUser(user.id, [sql`UPDATE dhun.profiles SET favourites=${JSON.stringify(backup.favourites)}::jsonb,preferences=${JSON.stringify(backup.preferences)}::jsonb,revision=revision+1,updated_at=now() WHERE user_id=${user.id}::uuid AND backup_consent_version=${POLICY_VERSION} AND revision=${backup.revision} RETURNING revision`]);
      if (!rows.length) throw new ApiError(409, 'Enable backups first, or reload the latest cloud revision before uploading again.');
      return rows[0];
    }
    if (action === 'erase') {
      if (body.confirm !== 'ERASE') throw new ApiError(400, 'Type ERASE to confirm.');
      await asUser(user.id, [sql`DELETE FROM dhun.profiles WHERE user_id=${user.id}::uuid`]);
      return { ok: true };
    }
    throw new ApiError(404, 'Not found.');
  });
}
