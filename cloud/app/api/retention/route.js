import {timingSafeEqual} from 'node:crypto';
import {db} from '../../../lib/db.mjs';
export const dynamic='force-dynamic';
export async function GET(request){
  const expected=process.env.CRON_SECRET&&'Bearer '+process.env.CRON_SECRET, actual=request.headers.get('authorization')||'';
  if(!expected||actual.length!==expected.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(actual)))return new Response('Unauthorized',{status:401});
  const sql=db();await sql`DELETE FROM dhun.activity WHERE day < (now() AT TIME ZONE 'UTC')::date-89`;
  return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}
