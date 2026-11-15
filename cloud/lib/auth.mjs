import { createNeonAuth } from '@neon/auth/next/server';
let instance;
export function auth() {
  if (!instance) instance = createNeonAuth({
    baseUrl: process.env.DHUN_NEON_AUTH_BASE_URL,
    cookies: { secret: process.env.DHUN_COOKIE_SECRET, sessionDataTtl: 60 },
    logLevel: 'silent',
  });
  return instance;
}
