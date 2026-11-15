import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLrc, lyricsQuery, lyricsRecord, bestLyricsMatch, getLyrics } from '../lyrics.mjs';
test('lyrics parse repeated timestamps, offsets, gaps, and plain/instrumental results', () => {
  assert.deepEqual(parseLrc('[ar:Example]\n[offset:100]\n[00:01.50][00:04.250]A quiet beginning\n[00:08.00]\n[00:99]bad'), [{ time: 1.4, text: 'A quiet beginning' }, { time: 4.15, text: 'A quiet beginning' }, { time: 7.9, text: '' }]);
  assert.deepEqual(lyricsQuery({ title: 'Example Artist - Example Song (Official Audio)', artist: 'ExampleArtistVEVO', duration: 123 }), { title: 'Example Song', artist: 'Example Artist', duration: 123 });
  assert.equal(lyricsRecord({ plainLyrics: 'A quiet beginning\nAnother moment' }).synced, false);
  assert.equal(lyricsRecord({ instrumental: true }).instrumental, true);
  assert.equal(lyricsRecord({ syncedLyrics: '[ar:Artist]' }), null);
  assert.deepEqual(parseLrc(null), []);
  assert.throws(() => lyricsQuery({ title: {}, artist: 'Artist' }));
});
test('matching rejects the wrong artist or edit, and the provider fallback is cached', async () => {
  const song = { title: 'Example Song', artist: 'Example Artist', duration: 123 };
  const record = { trackName: song.title, artistName: song.artist, duration: 123, syncedLyrics: '[00:01]A quiet beginning' };
  assert.equal(bestLyricsMatch([{ ...record, artistName: 'Wrong artist' }, { ...record, duration: 333 }], song), null);
  let calls = 0;
  const fetcher = async url => { calls++; return url.includes('/get?') ? new Response('', { status: 404 }) : Response.json([record]); };
  const result = await getLyrics(song, fetcher);
  assert.equal(result.synced, true); assert.equal(result.source, 'LRCLIB'); assert.equal(calls, 2);
  await getLyrics(song, fetcher); assert.equal(calls, 2);
});
