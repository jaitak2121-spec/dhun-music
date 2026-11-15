import { neon } from '@neondatabase/serverless';
import { ApiError, validUserId } from './domain.mjs';
let database;
export function db() {
  if (!database) {
    if (!process.env.DHUN_DATABASE_URL) throw new Error('Dhun database is not configured.');
    database = neon(process.env.DHUN_DATABASE_URL);
  }
  return database;
}
/** Every user-data transaction drops the service role and binds one verified identity. */
export async function asUser(userId, queries) {
  if (!validUserId(userId)) throw new ApiError(401, 'Sign in again.');
  const sql = db();
  const result = await sql.transaction([
    sql`SELECT set_config('dhun.user_id', ${userId}, true)`,
    sql`SET LOCAL ROLE dhun_app`,
    ...queries,
  ]);
  return result.slice(2);
}
