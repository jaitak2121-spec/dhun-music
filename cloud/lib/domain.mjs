import { createHash, randomBytes } from 'node:crypto';
export const POLICY_VERSION = '2026-11-16';
export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const randomToken = () => randomBytes(32).toString('base64url');
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export const validToken = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
export const validUserId = value => typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value);
export function validateBackup(input) {
  if (!input || typeof input !== 'object' || !Number.isSafeInteger(input.revision) || input.revision < 0 || input.revision >= 2147483647 || !Array.isArray(input.favourites) || input.favourites.length > 1000) throw new ApiError(400, 'Invalid backup or revision.');
  if (Object.keys(input).some(key => !['revision', 'favourites', 'preferences'].includes(key))) throw new ApiError(400, 'Only favourites and appearance preferences can be backed up.');
  const seen = new Set();
  const favourites = input.favourites.map(item => {
    if (!item || typeof item !== 'object' || Object.keys(item).some(key => !['videoId', 'title', 'artist', 'durationSeconds'].includes(key)) || typeof item.videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(item.videoId) || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 300 || typeof item.artist !== 'string' || item.artist.length > 200 || !Number.isFinite(item.durationSeconds) || item.durationSeconds < 0 || item.durationSeconds > 86400 || seen.has(item.videoId)) throw new ApiError(400, 'Invalid or duplicate favourite. Local file paths, credentials and stream URLs cannot be uploaded.');
    seen.add(item.videoId);
    return { videoId: item.videoId, title: item.title.trim(), artist: item.artist, durationSeconds: item.durationSeconds };
  });
  const p = input.preferences;
  if (!p || Object.keys(p).some(key => !['theme', 'appearance', 'reduceMotion'].includes(key)) || !['monochrome', 'indigo', 'forest'].includes(p.theme) || !['dark', 'light', 'system'].includes(p.appearance) || typeof p.reduceMotion !== 'boolean') throw new ApiError(400, 'Invalid appearance preferences.');
  return { revision: input.revision, favourites, preferences: { theme: p.theme, appearance: p.appearance, reduceMotion: p.reduceMotion } };
}

export function validateGoogleLogin(body, origin) {
  if (!body || Object.keys(body).some(key => !['provider','dhunConsent','callbackURL','disableRedirect'].includes(key))) throw new ApiError(400, 'Unsupported sign-in option.');
  if (body?.provider !== 'google' || body.dhunConsent !== true) throw new ApiError(400, 'Accept the account privacy notice before continuing with Google.');
  let callback;
  try { callback = new URL(body.callbackURL); } catch { throw new ApiError(400, 'Invalid sign-in return address.'); }
  const parameter=callback.pathname==='/connect'?'code':'connect';
  if (callback.origin !== origin || !['/','/connect'].includes(callback.pathname) || callback.hash || [...callback.searchParams.keys()].some(key => key !== parameter) || callback.searchParams.getAll(parameter).length > 1 || ((callback.search||callback.pathname==='/connect') && !/^[A-F0-9]{8}$/.test(callback.searchParams.get(parameter) || ''))) throw new ApiError(400, 'Invalid sign-in return address.');
}
