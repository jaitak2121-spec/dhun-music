// SPDX-License-Identifier: GPL-3.0-only
const cache = new Map();
let pending = Promise.resolve();
let nextRequestAt = 0;
let retryAt = 0;
export function parseLrc(text) {
  if (typeof text !== 'string' || text.length > 1_000_000) return [];
  const offset = Number(text.match(/\[offset:([+-]?\d+)\]/i)?.[1] || 0) / 1000;
  const lines = [];
  for (const row of text.split(/\r?\n/).slice(0, 5000)) {
    const stamps = [...row.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    const content = row.replace(/\[[^\]]*\]/g, '').replace(/<\d+:\d+(?:\.\d+)?>/g, '').trim();
    for (const stamp of stamps) {
      if (Number(stamp[2]) >= 60) continue;
      const time = Number(stamp[1]) * 60 + Number(stamp[2]) + Number(`0.${stamp[3] || 0}`) - offset;
      lines.push({ time: Math.max(0, time), text: content });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}
const clean = value => value.replace(/\s*(?:\(|\[)(?:official\s*)?(?:music\s*)?(?:video|audio|lyric(?:s| video)?|visualizer|hd|4k)(?:\)|\])\s*/gi, ' ').replace(/\s+/g, ' ').trim();
export function lyricsQuery(track) {
  if (!track || typeof track.title !== 'string' || !track.title.trim() || track.title.length > 300 || typeof track.artist !== 'string' || track.artist.length > 200) throw Error('Choose a song title and artist for lyrics.');
  let title = clean(track.title);
  let artist = track.local ? '' : track.artist.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim();
  const split = title.match(/^(.{1,150}?)\s+[–—-]\s+(.+)$/);
  if (split) { artist = split[1].trim(); title = split[2].trim(); }
  return { title, artist, duration: Number.isFinite(track.duration) && track.duration > 0 ? track.duration : 0 };
}
export function lyricsRecord(record) {
  if (!record || typeof record !== 'object') return null;
  if (record.instrumental === true) return { source: 'LRCLIB', instrumental: true, synced: false, lines: [] };
  const synced = parseLrc(record.syncedLyrics);
  const plain = typeof record.plainLyrics === 'string' ? record.plainLyrics.slice(0, 1_000_000).split(/\r?\n/).slice(0, 5000).map(text => ({ time: null, text })) : [];
  if (!synced.some(line => line.text) && !plain.some(line => line.text.trim())) return null;
  return { source: 'LRCLIB', synced: synced.some(line => line.text), instrumental: false, lines: synced.some(line => line.text) ? synced : plain, title: String(record.trackName || '').slice(0, 300), artist: String(record.artistName || '').slice(0, 200) };
}
const comparable = value => String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export function bestLyricsMatch(records, query) {
  if (!Array.isArray(records)) return null;
  return records.filter(record => record && typeof record === 'object' && comparable(record.trackName) === comparable(query.title) &&
    (!query.artist || comparable(record.artistName) === comparable(query.artist)) &&
    (!query.duration || (Number.isFinite(record.duration) && Math.abs(record.duration - query.duration) <= Math.max(8, query.duration * .04))) && lyricsRecord(record))
    .sort((a, b) => Math.abs(a.duration - query.duration) - Math.abs(b.duration - query.duration) || Number(Boolean(b.syncedLyrics)) - Number(Boolean(a.syncedLyrics)))[0] || null;
}
export function getLyrics(input, fetcher = fetch) {
  const query = lyricsQuery(input);
  const key = JSON.stringify(query);
  if (cache.has(key)) return cache.get(key);
  const result = pending.catch(() => {}).then(async () => {
    async function lookup(endpoint, params) {
      if (Date.now() < retryAt) throw Error(`Lyrics service is busy. Try again in ${Math.ceil((retryAt - Date.now()) / 1000)} seconds.`);
      await new Promise(resolve => setTimeout(resolve, Math.max(0, nextRequestAt - Date.now())));
      nextRequestAt = Date.now() + 300;
      const url = new URL(`https://lrclib.net/api/${endpoint}`);
      for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
      const response = await fetcher(url.href, { headers: { 'User-Agent': 'Dhun Desktop/0.2.0 (https://github.com/jaitak2121-spec/dhun-music)' }, signal: AbortSignal.timeout(10000) }).catch(() => { throw Error('Could not reach the lyrics service. Check your connection and try again.'); });
      if (response.status === 429 || response.status === 503) {
        const header = response.headers.get('retry-after');
        const delay = header && /^\d+$/.test(header) ? Number(header) * 1000 : header && Number.isFinite(Date.parse(header)) ? Math.max(1000, Date.parse(header) - Date.now()) : 30000;
        retryAt = Date.now() + delay * (1 + Math.random() * .3);
        throw Error('Lyrics service is busy. Please try again later.');
      }
      if (response.status === 404) return null;
      if (!response.ok) throw Error('Lyrics service is unavailable. Please try again later.');
      const text = await response.text();
      if (text.length > 4_000_000) throw Error('Lyrics response is too large.');
      try { return JSON.parse(text); } catch { throw Error('Lyrics service returned an unreadable response. Please try later.'); }
    }
    if (query.artist) {
      const exact = await lookup('get', { track_name: query.title, artist_name: query.artist, duration: query.duration > 0 && query.duration <= 3600 ? Math.round(query.duration) : undefined });
      const found = lyricsRecord(bestLyricsMatch([exact], query));
      if (found) return found;
    }
    const records = await lookup('search', { track_name: query.title, artist_name: query.artist });
    return lyricsRecord(bestLyricsMatch(records, query));
  });
  pending = result;
  cache.set(key, result);
  if (cache.size > 50) cache.delete(cache.keys().next().value);
  result.then(found => { if (!found) cache.delete(key); }, () => cache.delete(key));
  return result;
}
