// SPDX-License-Identifier: GPL-3.0-only
export const RELEASES = 'https://github.com/jaitak2121-spec/dhun-music/releases/tag/desktop-preview';
export const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value);
export function searchTerm(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 160) throw Error('Enter a search of 1–160 characters.');
  return value.trim();
}
export function tracksFromSearch(result) {
  return (result.entries || []).filter(entry => validId(entry.id) && entry.title && entry.availability !== 'private').map(entry => ({
    id: entry.id, title: String(entry.title).slice(0, 300),
    artist: String(entry.channel || entry.uploader || 'YouTube').slice(0, 200),
    duration: Number.isFinite(entry.duration) ? Math.max(0, entry.duration) : 0,
    artwork: `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
  }));
}
export function nextIndex(index, length, direction, repeat, shuffle, random = Math.random) {
  if (!length) return -1;
  if (shuffle && length > 1) return (index + 1 + Math.floor(random() * (length - 1))) % length;
  const next = index + direction;
  return next >= 0 && next < length ? next : repeat ? (next + length) % length : -1;
}
