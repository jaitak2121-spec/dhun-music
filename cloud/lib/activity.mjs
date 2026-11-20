import { createHmac } from 'node:crypto';
import { ApiError } from './domain.mjs';
import { db } from './db.mjs';

export function activityInput(body, erase = false) {
  const keys = erase ? ['installation'] : ['installation','platform','version'];
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !keys.includes(key)) ||
      typeof body.installation !== 'string' || !/^[a-f0-9]{64}$/.test(body.installation) ||
      (!erase && (!['android','windows','mac','ios'].includes(body.platform) || typeof body.version !== 'string' || !/^[0-9][A-Za-z0-9.+-]{0,39}$/.test(body.version)))) {
    throw new ApiError(400, 'Invalid activity signal.');
  }
  return body;
}
export function installationHash(secret) {
  if (!process.env.DHUN_RATE_SECRET) throw Error('Activity hashing is not configured.');
  return createHmac('sha256',process.env.DHUN_RATE_SECRET).update('activity:'+secret).digest('hex');
}
export async function activity(body, erase = false) {
  activityInput(body,erase);
  const sql=db(), key=installationHash(body.installation);
  if (erase) await sql`DELETE FROM dhun.activity WHERE installation=${key}`;
  else await sql`INSERT INTO dhun.activity (installation,platform,version) VALUES (${key},${body.platform},${body.version}) ON CONFLICT (installation,day) DO NOTHING`;
  await sql`DELETE FROM dhun.activity WHERE day < (now() AT TIME ZONE 'UTC')::date-89`;
  return {ok:true};
}
export async function usageOverview() {
  const sql=db();
  const [totals,versions,daily,downloads] = await sql.transaction([
    sql`WITH installs AS (SELECT installation,min(day) first_day,max(day) last_day FROM dhun.activity WHERE day >= (now() AT TIME ZONE 'UTC')::date-89 GROUP BY installation)
      SELECT count(*) FILTER (WHERE last_day=(now() AT TIME ZONE 'UTC')::date)::int AS today,
      count(*) FILTER (WHERE last_day >= (now() AT TIME ZONE 'UTC')::date-29)::int AS monthly,
      count(*) FILTER (WHERE first_day=(now() AT TIME ZONE 'UTC')::date)::int AS new_today,
      count(*) FILTER (WHERE last_day=(now() AT TIME ZONE 'UTC')::date AND first_day<(now() AT TIME ZONE 'UTC')::date)::int AS returning_today FROM installs`,
    sql`SELECT platform,version,count(*)::int AS installations FROM (SELECT DISTINCT ON (installation) installation,platform,version FROM dhun.activity WHERE day >= (now() AT TIME ZONE 'UTC')::date-29 ORDER BY installation,day DESC) latest GROUP BY platform,version ORDER BY installations DESC`,
    sql`SELECT day::text,count(*)::int AS installations FROM dhun.activity WHERE day >= (now() AT TIME ZONE 'UTC')::date-29 GROUP BY day ORDER BY day DESC`,
    sql`SELECT platform,sum(clicks)::text AS clicks FROM dhun.download_clicks GROUP BY platform ORDER BY platform`,
  ]);
  return {totals:totals[0],versions,daily,downloads};
}
