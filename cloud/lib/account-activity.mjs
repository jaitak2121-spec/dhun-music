import {ApiError} from './domain.mjs';
import {db} from './db.mjs';

export const ACCOUNT_ACTIVITY_POLICY_VERSION='2026-11-19';
export function accountActivityInput(body,consent=false){
  const keys=consent?['agree','policyVersion']:['platform','version'];
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!keys.includes(key))||
    (consent?typeof body.agree!=='boolean'||body.policyVersion!==ACCOUNT_ACTIVITY_POLICY_VERSION:
      !['android','windows','mac','ios'].includes(body.platform)||typeof body.version!=='string'||!/^[0-9][A-Za-z0-9.+-]{0,39}$/.test(body.version)))
    throw new ApiError(400,'Invalid account activity choice or signal.');
  return body;
}
export async function accountActivityConsent(userId,body){
  accountActivityInput(body,true);const sql=db();
  // Lock the profile in both paths so an in-flight signal cannot outlive opt-out.
  const [profiles]=await sql.transaction([
    sql`UPDATE dhun.profiles SET activity_consent_version=${body.agree?ACCOUNT_ACTIVITY_POLICY_VERSION:null},activity_consented_at=${body.agree?new Date().toISOString():null}::timestamptz WHERE user_id=${userId}::uuid RETURNING user_id`,
    sql`DELETE FROM dhun.account_activity WHERE user_id=${userId}::uuid AND ${!body.agree}`,
  ]);
  if(!profiles.length)throw new ApiError(409,'Connect a Dhun device before enabling account activity.');
  return{enabled:body.agree};
}
export async function accountActivity(userId,body){
  accountActivityInput(body);const sql=db();
  const [,rows]=await sql.transaction([
    sql`SELECT user_id FROM dhun.profiles WHERE user_id=${userId}::uuid FOR UPDATE`,
    sql`INSERT INTO dhun.account_activity (user_id,platform,version) SELECT user_id,${body.platform},${body.version} FROM dhun.profiles WHERE user_id=${userId}::uuid AND activity_consent_version=${ACCOUNT_ACTIVITY_POLICY_VERSION} ON CONFLICT (user_id,day,platform) DO UPDATE SET version=EXCLUDED.version RETURNING user_id`,
  ]);
  return{enabled:rows.length>0};
}
export async function accountUsageOverview(){
  const sql=db();const [totals,versions,daily]=await sql.transaction([
    sql`WITH accounts AS (SELECT user_id,min(day) first_day,max(day) last_day FROM dhun.account_activity WHERE day >= (now() AT TIME ZONE 'UTC')::date-89 GROUP BY user_id)
      SELECT count(*) FILTER (WHERE last_day=(now() AT TIME ZONE 'UTC')::date)::int AS today,
      count(*) FILTER (WHERE last_day >= (now() AT TIME ZONE 'UTC')::date-29)::int AS monthly,
      count(*) FILTER (WHERE first_day=(now() AT TIME ZONE 'UTC')::date)::int AS new_today,
      count(*) FILTER (WHERE last_day=(now() AT TIME ZONE 'UTC')::date AND first_day<(now() AT TIME ZONE 'UTC')::date)::int AS returning_today FROM accounts`,
    sql`SELECT platform,version,count(*)::int AS accounts FROM (SELECT DISTINCT ON (user_id,platform) user_id,platform,version FROM dhun.account_activity WHERE day >= (now() AT TIME ZONE 'UTC')::date-29 ORDER BY user_id,platform,day DESC) latest GROUP BY platform,version ORDER BY accounts DESC`,
    sql`SELECT day::text,count(DISTINCT user_id)::int AS accounts FROM dhun.account_activity WHERE day >= (now() AT TIME ZONE 'UTC')::date-29 GROUP BY day ORDER BY day DESC`,
  ]);return{totals:totals[0],versions,daily};
}
