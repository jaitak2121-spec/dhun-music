import test from 'node:test';
import assert from 'node:assert/strict';
import { googleNativeConfig, validateNativeGoogle } from '../lib/domain.mjs';
import { tokenHash } from '../lib/domain.mjs';

const clientId = '123456789-test.apps.googleusercontent.com';
const challenge = 'a'.repeat(43);
const claims = () => ({ aud: clientId, nonce: tokenHash(challenge), iss: 'https://accounts.google.com', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600 });
const credential = claims => ['header', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'signature'].join('.');
const body = () => ({ challenge, agree: true, policyVersion: '2026-11-16', idToken: credential(claims()) });

test('native sign-in is unavailable until explicitly configured with a valid public client ID', () => {
  const enabled = process.env.DHUN_NATIVE_GOOGLE_ENABLED, id = process.env.DHUN_GOOGLE_WEB_CLIENT_ID;
  try {
    process.env.DHUN_NATIVE_GOOGLE_ENABLED='false';process.env.DHUN_GOOGLE_WEB_CLIENT_ID=clientId;
    assert.deepEqual(googleNativeConfig(),{enabled:false});
    process.env.DHUN_NATIVE_GOOGLE_ENABLED='true';process.env.DHUN_GOOGLE_WEB_CLIENT_ID='not-a-client';
    assert.deepEqual(googleNativeConfig(),{enabled:false});
    process.env.DHUN_GOOGLE_WEB_CLIENT_ID=clientId;
    assert.deepEqual(googleNativeConfig(),{enabled:true,serverClientId:clientId});
  } finally {
    if(enabled===undefined)delete process.env.DHUN_NATIVE_GOOGLE_ENABLED;else process.env.DHUN_NATIVE_GOOGLE_ENABLED=enabled;
    if(id===undefined)delete process.env.DHUN_GOOGLE_WEB_CLIENT_ID;else process.env.DHUN_GOOGLE_WEB_CLIENT_ID=id;
  }
});
test('native request binding rejects missing consent, replay binding, wrong audience and expired credentials', () => {
  // Passing this preflight does NOT authenticate the synthetic JWT: managed
  // Google authentication must still verify its signature and return a user.
  assert.doesNotThrow(()=>validateNativeGoogle(body(),clientId));
  for(const replacement of [{agree:false},{policyVersion:'old'},{challenge:'b'.repeat(43)},{email:'attacker@example.invalid'},{idToken:'bad'}]) assert.throws(()=>validateNativeGoogle({...body(),...replacement},clientId));
  for(const change of [{nonce:'wrong'},{aud:'another-client'},{iss:'https://attacker.example'},{exp:1},{iat:1},{iat:Math.floor(Date.now()/1000)+600}]) assert.throws(()=>validateNativeGoogle({...body(),idToken:credential({...claims(),...change})},clientId));
});
