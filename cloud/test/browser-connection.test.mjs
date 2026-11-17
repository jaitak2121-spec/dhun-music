import test from 'node:test';
import assert from 'node:assert/strict';
import {browserApproval,hasBrowserApproval} from '../lib/browser-connection.mjs';
import {validateGoogleLogin} from '../lib/domain.mjs';
test('browser approval is signed, short lived and bound to one connection',()=>{
 process.env.DHUN_COOKIE_SECRET='test-only-cookie-signing-secret';const now=Date.now(),value=browserApproval('A1B2C3D4',now);
 assert.equal(hasBrowserApproval(value,'A1B2C3D4',now+1000),true);
 for(const candidate of [value+'x',value.replace('A1','B1'),value.split('.').slice(0,2).join('.')+'.'+'é'.repeat(43),null])assert.equal(hasBrowserApproval(candidate,'A1B2C3D4',now+1000),false);
 assert.equal(hasBrowserApproval(value,'B1B2C3D4',now),false);assert.equal(hasBrowserApproval(value,'A1B2C3D4',now+300000),false);
});
test('Google callback allows only the dedicated connection page and a single valid code',()=>{
 const origin='https://dhun-cloud.vercel.app',base={provider:'google',dhunConsent:true};
 assert.doesNotThrow(()=>validateGoogleLogin({...base,callbackURL:origin+'/connect?code=A1B2C3D4'},origin));
 for(const suffix of ['/connect','/connect?code=bad','/connect?code=A1B2C3D4&code=A1B2C3D4','/connect?code=A1B2C3D4&redirect=https://evil.example'])assert.throws(()=>validateGoogleLogin({...base,callbackURL:origin+suffix},origin));
});
