import { db } from '../../../../lib/db.mjs';
import { installerTarget } from '../../../../lib/downloads.mjs';
import { limit } from '../../../../lib/http.mjs';
export const dynamic='force-dynamic';
export async function GET(request,context) {
  const {platform}=await context.params, target=installerTarget(platform);
  if (!target) return new Response('Not found',{status:404});
  // Best effort: database outages must never prevent downloading an installer.
  try {
    await limit(request,'download',30);
    const sql=db();
    await sql`INSERT INTO dhun.download_clicks(platform,clicks) VALUES (${platform},1) ON CONFLICT(day,platform) DO UPDATE SET clicks=dhun.download_clicks.clicks+1`;
  } catch { /* Counts are approximate, including repeat clicks and bots. */ }
  return new Response(null,{status:302,headers:{Location:target,'Cache-Control':'no-store'}});
}
