import test from 'node:test';
import assert from 'node:assert/strict';
import {activityInput,installationHash} from '../lib/activity.mjs';
import {installerTarget} from '../lib/downloads.mjs';
test('activity accepts only anonymous installation/version fields; erase uses possession of the secret',()=>{
  const value={installation:'a'.repeat(64),platform:'android',version:'1.7.1-preview.29'};
  assert.deepEqual(activityInput(value),value);
  for(const key of ['email','userId','songs','location','day'])assert.throws(()=>activityInput({...value,[key]:'private'}));
  for(const installation of ['', 'a'.repeat(63),{},null])assert.throws(()=>activityInput({...value,installation}));
  assert.throws(()=>activityInput({...value,platform:'web'}));
  assert.throws(()=>activityInput({...value,version:'<script>'}));
  assert.doesNotThrow(()=>activityInput({installation:value.installation},true));
  process.env.DHUN_RATE_SECRET='unit-test-only';
  assert.match(installationHash(value.installation),/^[a-f0-9]{64}$/);
  assert.notEqual(installationHash(value.installation),value.installation);
});
test('installer redirects use a fixed allowlist',()=>{
  assert.ok(installerTarget('android').endsWith('/Dhun.apk'));
  for(const input of ['https://evil.example','__proto__','../windows','toString'])assert.equal(installerTarget(input),null);
});
