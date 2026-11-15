import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup, randomToken, validToken, tokenHash } from '../lib/domain.mjs';
const backup = () => ({ revision: 0, favourites: [{ videoId: 'dQw4w9WgXcQ', title: 'A song', artist: 'An artist', durationSeconds: 210 }], preferences: { theme: 'monochrome', appearance: 'dark', reduceMotion: false } });
test('backup whitelist excludes credentials and local paths at every level', () => {
  for (const key of ['password','cookie','localPath','streamUrl','userId']) {
    const top = backup(); top[key] = 'secret'; assert.throws(()=>validateBackup(top));
    const song = backup(); song.favourites[0][key] = 'secret'; assert.throws(()=>validateBackup(song));
    const prefs = backup(); prefs.preferences[key] = 'secret'; assert.throws(()=>validateBackup(prefs));
  }
});
test('rejects duplicate songs, unbounded numbers and invalid revisions', () => {
  const duplicate=backup();duplicate.favourites.push({...duplicate.favourites[0]});assert.throws(()=>validateBackup(duplicate));
  for(const duration of [-1,86401,NaN,Infinity,'200']){const b=backup();b.favourites[0].durationSeconds=duration;assert.throws(()=>validateBackup(b));}
  for(const revision of [-1,2147483647,0.5,'0'])assert.throws(()=>validateBackup({...backup(),revision}));
  assert.deepEqual(validateBackup(backup()),backup());
});
test('device secrets are random, full length, and hash before storage',()=>{
  const a=randomToken(),b=randomToken();assert.ok(validToken(a));assert.notEqual(a,b);assert.notEqual(tokenHash(a),a);assert.equal(tokenHash(a).length,64);
});
