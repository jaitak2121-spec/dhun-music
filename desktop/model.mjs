// SPDX-License-Identifier: GPL-3.0-only
export const RELEASES = 'https://github.com/jaitak2121-spec/dhun-music/releases/tag/preview';
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

export function discoveryQueries(taste) {
  if (!taste || typeof taste !== 'object' || ['language','artists','genres'].some(key => typeof taste[key] !== 'string') || taste.language.length > 40 || taste.artists.length > 160 || taste.genres.length > 60) throw Error('Enter a language, up to three artists, and genres within the displayed limits.');
  const names=taste.artists.split(',').map(name=>name.trim().slice(0,50)).filter(Boolean)
    .filter((name,index,all)=>all.findIndex(other=>other.toLocaleLowerCase()===name.toLocaleLowerCase())===index).slice(0,3);
  const context=[taste.language.trim(),taste.genres.trim()].filter(Boolean);
  return (names.length?names:['']).map(artist=>[artist,...context].filter(Boolean).join(' ')).filter(Boolean).map(query=>`${query.slice(0,150)} songs`);
}

export function diverseTracks(batches, excluded = [], limit = 12) {
  if(limit<=0)return[];
  const ids=new Set(excluded),recordings=new Set(),artists=new Map(),result=[];
  for(let i=0;i<Math.max(0,...batches.map(batch=>batch.length));i++)for(const batch of batches){
    const track=batch[i];if(!track||track.local||!validId(track.id)||typeof track.title!=='string'||typeof track.artist!=='string')continue;
    const artist=track.artist.toLocaleLowerCase().replace(/\s*-\s*topic$|vevo$/gi,'').trim();
    const title=track.title.toLocaleLowerCase().replace(/\([^)]*(?:official|lyrics?|audio|video)[^)]*\)|\[[^\]]*(?:official|lyrics?|audio|video)[^\]]*\]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
    const recording=`${artist}:${title}`;
    if(ids.has(track.id)||recordings.has(recording)||(artists.get(artist)||0)>=3)continue;
    ids.add(track.id);recordings.add(recording);artists.set(artist,(artists.get(artist)||0)+1);result.push(track);
    if(result.length>=limit)return result;
  }
  return result;
}

/** Local-only artist seeds. Brief plays do not vote; early skips reduce a vote. */
export function listeningTaste(taste, signals = [], favourites = []) {
  discoveryQueries(taste);
  const scores = new Map();
  const add = (artist, score) => {
    if (typeof artist !== 'string' || !artist.trim() || artist === 'Unknown' || !Number.isFinite(score)) return;
    const key = artist.trim().slice(0, 50); scores.set(key, (scores.get(key) || 0) + score);
  };
  for (const entry of (Array.isArray(signals) ? signals : []).slice(0,200)) {
    if (!entry || !validId(entry.id)) continue;
    add(entry.artist, Math.min(20, Math.max(0, Number(entry.plays)||0)) - Math.min(20,Math.max(0,Number(entry.skips)||0)));
  }
  for (const track of favourites.slice(0,1000)) if (track && !track.local && validId(track.id)) add(track.artist, 3);
  const learned = [...scores].filter(([,score])=>score>0).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([artist])=>artist);
  const explicit = taste.artists.split(',').map(a=>a.trim()).filter(Boolean);
  const artists = learned.length ? [...explicit.slice(0,1),...learned] : explicit;
  return {...taste,artists:[...new Set(artists)].slice(0,3).join(', ').slice(0,160)};
}
